// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { PullToken } from "../../contracts/actions/utils/PullToken.sol";
import { SendToken } from "../../contracts/actions/utils/SendToken.sol";
import { FLAction } from "../../contracts/actions/flashloan/FLAction.sol";
import { SFProxyEntryPoint } from "../../contracts/actions/summerfi/SFProxyEntryPoint.sol";
import { FLHelper } from "../../contracts/actions/flashloan/helpers/FLHelper.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { SFProxyUtils } from "../utils/summerfi/SFProxyUtils.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";

/// @dev Recipe execution from strategy is already tested in StrategyExecutor tests
/// @dev Here, we just test direct recipe execution with and without flash loan
contract TestCore_RecipeExecutor is ActionsUtils, RegistryUtils, BaseTest, SFProxyUtils, FLHelper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    RecipeExecutor cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address flAddress;

    SmartWallet[] wallets;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        SmartWallet safeWallet = new SmartWallet(bob);
        bool isLineaOrPlasma = block.chainid == 59_144 || block.chainid == 9745;

        if (isLineaOrPlasma) {
            wallets = new SmartWallet[](1);
            wallets[0] = safeWallet;
        } else {
            SmartWallet dsProxyWallet = new SmartWallet(alice);
            dsProxyWallet.createDSProxy();

            SmartWallet dsaProxyWallet = new SmartWallet(charlie);
            dsaProxyWallet.createDSAProxy();

            SmartWallet sfProxyWallet = new SmartWallet(jane);
            sfProxyWallet.createSFProxy();

            wallets = new SmartWallet[](4);
            wallets[0] = safeWallet;
            wallets[1] = dsProxyWallet;
            wallets[2] = dsaProxyWallet;
            wallets[3] = sfProxyWallet;
        }

        cut = new RecipeExecutor();

        redeploy("RecipeExecutor", address(cut));
        redeploy("SFProxyEntryPoint", address(new SFProxyEntryPoint()));
        redeploy("PullToken", address(new PullToken()));
        redeploy("SendToken", address(new SendToken()));

        flAddress = address(new FLAction());
        redeploy("FLAction", flAddress);

        _whitelistSFProxyEntryPoint();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_execute_recipe_without_flashloan() public {
        for (uint256 i = 0; i < wallets.length; i++) {
            address tokenAddr = Addresses.WETH_ADDR;
            uint256 amount = 1 ether;

            bytes[] memory actionsCalldata = new bytes[](2);
            actionsCalldata[0] = pullTokenEncode(tokenAddr, wallets[i].owner(), amount);
            actionsCalldata[1] = sendTokenEncode(tokenAddr, wallets[i].owner(), amount);

            bytes4[] memory ids = new bytes4[](2);
            ids[0] = bytes4(keccak256("PullToken"));
            ids[1] = bytes4(keccak256("SendToken"));

            StrategyModel.Recipe memory recipe =
                _create_placeholder_recipe("TestRecipeWithoutFlashloan", actionsCalldata, ids);

            bytes memory _calldata =
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe);

            give(tokenAddr, wallets[i].owner(), amount);
            approveAsSender(wallets[i].owner(), tokenAddr, wallets[i].walletAddr(), amount);

            uint256 senderBalanceBefore = balanceOf(tokenAddr, wallets[i].owner());
            wallets[i].execute(address(cut), _calldata, 0);
            uint256 senderBalanceAfter = balanceOf(tokenAddr, wallets[i].owner());

            assertEq(senderBalanceBefore, senderBalanceAfter);
        }
    }

    function test_should_execute_recipe_with_flashloan() public {
        for (uint256 i = 0; i < wallets.length; i++) {
            address tokenAddr = Addresses.WETH_ADDR;
            uint256 amount = 1 ether;
            // No Balancer on Linea and Plasma
            bool useAaveV3 = block.chainid == 59_144 || block.chainid == 9745;

            bytes[] memory actionsCalldata = new bytes[](2);
            actionsCalldata[0] = flActionEncode(
                tokenAddr, amount, useAaveV3 ? FLSource.AAVEV3 : FLSource.BALANCER
            );
            actionsCalldata[1] = sendTokenEncode(tokenAddr, flAddress, amount);

            bytes4[] memory ids = new bytes4[](2);
            ids[0] = bytes4(keccak256("FLAction"));
            ids[1] = bytes4(keccak256("SendToken"));

            StrategyModel.Recipe memory recipe =
                _create_placeholder_recipe("TestRecipeWithFlashloan", actionsCalldata, ids);
            // SendToken.amount should be FL payback amount (amount + fee).
            recipe.paramMapping[1][2] = 1;

            bytes memory _calldata =
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe);

            uint256 aaveFLFee = 0;
            if (useAaveV3) {
                uint256 premiumBps = IPoolV3(AAVE_V3_LENDING_POOL).FLASHLOAN_PREMIUM_TOTAL();
                aaveFLFee = (amount * premiumBps + 9999) / 10_000;
                give(tokenAddr, wallets[i].walletAddr(), aaveFLFee);
            }

            uint256 senderBalanceBefore = balanceOf(tokenAddr, wallets[i].owner());
            uint256 walletBalanceBefore = balanceOf(tokenAddr, wallets[i].walletAddr());

            wallets[i].execute(address(cut), _calldata, 0);

            uint256 senderBalanceAfter = balanceOf(tokenAddr, wallets[i].owner());
            uint256 walletBalanceAfter = balanceOf(tokenAddr, wallets[i].walletAddr());

            assertEq(senderBalanceBefore, senderBalanceAfter);
            assertEq(walletBalanceBefore, walletBalanceAfter + aaveFLFee); // will be 0 if we arent on linea or plasma. Because we used balancer
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _create_placeholder_recipe(
        string memory _name,
        bytes[] memory _actionsCalldata,
        bytes4[] memory _actionIds
    ) internal pure returns (StrategyModel.Recipe memory recipe) {
        uint8[][] memory paramMap = new uint8[][](_actionIds.length);
        for (uint256 i = 0; i < _actionIds.length; i++) {
            paramMap[i] = new uint8[](3);
        }

        recipe = StrategyModel.Recipe({
            name: _name,
            callData: _actionsCalldata,
            subData: new bytes32[](0),
            actionIds: _actionIds,
            paramMapping: paramMap
        });
    }
}
