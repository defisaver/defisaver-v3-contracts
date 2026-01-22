// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { PullToken } from "../../contracts/actions/utils/PullToken.sol";
import { SendToken } from "../../contracts/actions/utils/SendToken.sol";
import { FLAction } from "../../contracts/actions/flashloan/FLAction.sol";
import { SFProxyEntryPoint } from "../../contracts/actions/summerfi/SFProxyEntryPoint.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Addresses } from "../utils/Addresses.sol";
import { SFProxyUtils } from "../utils/summerfi/SFProxyUtils.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";

/// @dev Recipe execution from strategy is already tested in StrategyExecutor tests
/// @dev Here, we just test direct recipe execution with and without flash loan
contract TestCore_RecipeExecutor is ActionsUtils, RegistryUtils, BaseTest, SFProxyUtils {
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
        forkMainnetLatest();

        SmartWallet safeWallet = new SmartWallet(bob);

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

            bytes[] memory actionsCalldata = new bytes[](2);
            actionsCalldata[0] = flActionEncode(tokenAddr, amount, FLSource.BALANCER);
            actionsCalldata[1] = sendTokenEncode(tokenAddr, flAddress, amount);

            bytes4[] memory ids = new bytes4[](2);
            ids[0] = bytes4(keccak256("FLAction"));
            ids[1] = bytes4(keccak256("SendToken"));

            StrategyModel.Recipe memory recipe =
                _create_placeholder_recipe("TestRecipeWithFlashloan", actionsCalldata, ids);

            bytes memory _calldata =
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe);

            uint256 senderBalanceBefore = balanceOf(tokenAddr, wallets[i].owner());
            uint256 walletBalanceBefore = balanceOf(tokenAddr, wallets[i].walletAddr());

            wallets[i].execute(address(cut), _calldata, 0);

            uint256 senderBalanceAfter = balanceOf(tokenAddr, wallets[i].owner());
            uint256 walletBalanceAfter = balanceOf(tokenAddr, wallets[i].walletAddr());

            assertEq(senderBalanceBefore, senderBalanceAfter);
            assertEq(walletBalanceBefore, walletBalanceAfter);
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
