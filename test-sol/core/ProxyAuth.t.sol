// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ProxyAuth } from "../../contracts/core/strategy/ProxyAuth.sol";
import { DSProxyPermission } from "../../contracts/auth/DSProxyPermission.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Const } from "../Const.sol";
import { TokenAddresses } from "../TokenAddresses.sol";

contract TestCore_ProxyAuth is RegistryUtils, ActionsUtils, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    ProxyAuth cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address dsProxyAddr;
    
    address strategyExecutorAddr;
    address dsProxyPermissionAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        dsProxyAddr = wallet.createDSProxy();

        cut = ProxyAuth(PROXY_AUTH_ADDR);

        dsProxyPermissionAddr = address(new DSProxyPermission());
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
                ProxyAuth.SenderNotExecutorError.selector,
                address(this),
                strategyExecutorAddr
            )
        );
        cut.callExecute(dsProxyAddr, RECIPE_EXECUTOR_ADDR, bytes("0x"));
    }

    function test_should_fail_to_execute_tx_when_no_auth_is_given() public {
        prank(strategyExecutorAddr);
        vm.expectRevert();
        cut.callExecute(dsProxyAddr, RECIPE_EXECUTOR_ADDR, bytes("0x"));
    }

    function test_should_execute_tx() public {
        // first approve auth contract to call execute from dsProxy
        bytes memory permissionCalldata = abi.encodeWithSelector(
            DSProxyPermission.giveProxyPermission.selector, address(cut)
        );
        wallet.execute(dsProxyPermissionAddr, permissionCalldata, 0);

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

        // execute tx from auth contract
        prank(strategyExecutorAddr);
        cut.callExecute(dsProxyAddr, RECIPE_EXECUTOR_ADDR, recipeExecutorCalldata);
    }
}
