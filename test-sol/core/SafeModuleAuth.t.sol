// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { SafeModuleAuth } from "../../contracts/core/strategy/SafeModuleAuth.sol";
import { SafeModulePermission } from "../../contracts/auth/SafeModulePermission.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { Pausable } from "../../contracts/auth/Pausable.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Const } from "../Const.sol";
import { TokenAddresses } from "../TokenAddresses.sol";

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

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        safeWalletAddr = wallet.createSafe();

        cut = SafeModuleAuth(MODULE_AUTH_ADDR);

        safeModulePermissionAddr = address(new SafeModulePermission());
        strategyExecutorAddr = address(new StrategyExecutor());
        redeploy("StrategyExecutorID", strategyExecutorAddr);

        vm.etch(RECIPE_EXECUTOR_ADDR, address(new RecipeExecutor()).code);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_call_execute_when_sender_is_not_executor() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                SafeModuleAuth.SenderNotExecutorError.selector,
                address(this),
                strategyExecutorAddr
            )
        );
        cut.callExecute(safeWalletAddr, RECIPE_EXECUTOR_ADDR, bytes("0x"));
    }

    function test_should_fail_to_call_execute_when_paused() public {
        prank(Const.ADMIN_ACC);
        cut.setPaused(true);

        prank(strategyExecutorAddr);
        vm.expectRevert(abi.encodeWithSelector(Pausable.ContractPaused.selector));
        cut.callExecute(safeWalletAddr, RECIPE_EXECUTOR_ADDR, bytes("0x"));
    }

    function test_should_fail_to_execute_safe_tx_when_no_auth_is_given() public {
        prank(strategyExecutorAddr);
        vm.expectRevert();
        cut.callExecute(safeWalletAddr, RECIPE_EXECUTOR_ADDR, bytes("0x"));
    }

    function test_should_execute_safe_tx() public {
        // first approve auth contract to call execute from safe
        bytes memory enableCalldata = abi.encodeWithSelector(SafeModulePermission.enableModule.selector, address(cut));
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
        cut.callExecute(safeWalletAddr, RECIPE_EXECUTOR_ADDR, recipeExecutorCalldata);
    }

    function test_should_revert_when_safe_tx_execution_fails() public {
        // first approve auth contract to call execute from safe
        bytes memory enableCalldata = abi.encodeWithSelector(SafeModulePermission.enableModule.selector, address(cut));
        wallet.execute(safeModulePermissionAddr, enableCalldata, 0);

        // create recipe
        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = flActionEncode(TokenAddresses.WETH_ADDR, 1000, FLSource.BALANCER);

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
        cut.callExecute(safeWalletAddr, RECIPE_EXECUTOR_ADDR, recipeExecutorCalldata);
    }
}
