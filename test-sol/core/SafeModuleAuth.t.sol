// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SafeModuleAuth } from "../../contracts/core/strategy/SafeModuleAuth.sol";
import { WalletAuth } from "../../contracts/core/strategy/WalletAuth.sol";
import { MockSafeModulePermission } from "../../contracts/mocks/MockSafeModulePermission.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { Pausable } from "../../contracts/auth/Pausable.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Addresses } from "../utils/Addresses.sol";

contract TestCore_SafeModuleAuth is RegistryUtils, ActionsUtils, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SafeModuleAuth cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address safeWalletAddr;

    address strategyExecutorAddr;
    address safeModulePermissionAddr;
    address recipeExecutorAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        safeWalletAddr = wallet.createSafe();

        SafeModuleAuth newCut = new SafeModuleAuth();
        vm.etch(MODULE_AUTH_ADDR, address(newCut).code);
        cut = SafeModuleAuth(MODULE_AUTH_ADDR);

        safeModulePermissionAddr = address(new MockSafeModulePermission());
        strategyExecutorAddr = address(new StrategyExecutor());
        redeploy("StrategyExecutorID", strategyExecutorAddr);

        recipeExecutorAddr = address(new RecipeExecutor());
        redeploy("RecipeExecutor", recipeExecutorAddr);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_call_execute_when_sender_is_not_executor() public {
        vm.expectRevert(
            abi.encodeWithSelector(WalletAuth.SenderNotExecutorError.selector, address(this), strategyExecutorAddr)
        );
        cut.callExecute(safeWalletAddr, recipeExecutorAddr, bytes("0x"));
    }

    function test_should_fail_to_call_execute_when_paused() public {
        prank(Addresses.ADMIN_ACC);
        cut.setPaused(true);

        prank(strategyExecutorAddr);
        vm.expectRevert(abi.encodeWithSelector(Pausable.ContractPaused.selector));
        cut.callExecute(safeWalletAddr, recipeExecutorAddr, bytes("0x"));
    }

    function test_should_fail_to_execute_safe_tx_when_no_auth_is_given() public {
        prank(strategyExecutorAddr);
        vm.expectRevert();
        cut.callExecute(safeWalletAddr, recipeExecutorAddr, bytes("0x"));
    }

    function test_should_execute_safe_tx() public {
        // first approve auth contract to call execute from safe
        bytes memory enableCalldata =
            abi.encodeWithSelector(MockSafeModulePermission.enableModule.selector, address(cut));
        wallet.execute(safeModulePermissionAddr, enableCalldata, 0);

        // create recipe
        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = sumInputsEncode(1, 2);

        bytes4[] memory ids = new bytes4[](1);
        ids[0] = bytes4(keccak256("SumInputs"));

        uint8[][] memory paramsMap = new uint8[][](1);
        paramsMap[0] = new uint8[](2);

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "TestRecipe",
            callData: actionsCalldata,
            subData: new bytes32[](1),
            actionIds: ids,
            paramMapping: paramsMap
        });

        // encode recipe executor call
        bytes memory recipeExecutorCalldata = abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe);

        // execute safe tx
        prank(strategyExecutorAddr);
        cut.callExecute(safeWalletAddr, recipeExecutorAddr, recipeExecutorCalldata);
    }

    function test_should_revert_when_safe_tx_execution_fails() public {
        // first approve auth contract to call execute from safe
        bytes memory enableCalldata =
            abi.encodeWithSelector(MockSafeModulePermission.enableModule.selector, address(cut));
        wallet.execute(safeModulePermissionAddr, enableCalldata, 0);

        // create recipe
        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = flActionEncode(Addresses.WETH_ADDR, 1000, FLSource.BALANCER);

        bytes4[] memory ids = new bytes4[](1);
        ids[0] = bytes4(keccak256("FLAction"));

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "TestRecipe",
            callData: actionsCalldata,
            subData: new bytes32[](1),
            actionIds: ids,
            paramMapping: new uint8[][](1)
        });

        // encode recipe executor call
        bytes memory recipeExecutorCalldata = abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe);

        // execute safe tx
        /// @dev we expect revert because we are using recipe with flAction without returning funds
        prank(strategyExecutorAddr);
        vm.expectRevert(abi.encodeWithSelector(SafeModuleAuth.SafeExecutionError.selector));
        cut.callExecute(safeWalletAddr, recipeExecutorAddr, recipeExecutorCalldata);
    }
}
