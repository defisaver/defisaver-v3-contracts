// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DSAAuth } from "../../contracts/core/strategy/DSAAuth.sol";
import { WalletAuth } from "../../contracts/core/strategy/WalletAuth.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { Pausable } from "../../contracts/auth/Pausable.sol";
import { DefiSaverConnector } from "../../contracts/actions/insta/DefiSaverConnector.sol";
import { IInstaConnectorsV2 } from "../../contracts/interfaces/insta/IInstaConnectorsV2.sol";

import { RegistryUtils } from "../utils/RegistryUtils.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { DSAProxyUtils } from "../utils/dsa/DSAProxyUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Addresses } from "../utils/Addresses.sol";
import { HandleAuth } from "../../contracts/actions/utils/HandleAuth.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestCore_DSAAuth is RegistryUtils, ActionsUtils, DSAProxyUtils, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    DSAAuth cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address dsaProxyAddr;
    
    address strategyExecutorAddr;
    address recipeExecutorAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        dsaProxyAddr = wallet.createDSAProxy();

        DSAAuth newCut = new DSAAuth();
        vm.etch(DSA_AUTH_ADDR, address(newCut).code);
        cut = DSAAuth(DSA_AUTH_ADDR);

        strategyExecutorAddr = address(new StrategyExecutor());
        redeploy("StrategyExecutorID", strategyExecutorAddr);

        recipeExecutorAddr = address(new RecipeExecutor());
        redeploy("RecipeExecutor", recipeExecutorAddr);

        redeploy("HandleAuth", address(new HandleAuth()));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_call_execute_when_sender_is_not_executor() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                WalletAuth.SenderNotExecutorError.selector,
                address(this),
                strategyExecutorAddr
            )
        );
        cut.callExecute(dsaProxyAddr, recipeExecutorAddr, bytes("0x"));
    }

    function test_should_fail_to_call_execute_when_paused() public {
        prank(Addresses.ADMIN_ACC);
        cut.setPaused(true);

        prank(strategyExecutorAddr);
        vm.expectRevert(abi.encodeWithSelector(Pausable.ContractPaused.selector));
        cut.callExecute(dsaProxyAddr, recipeExecutorAddr, bytes("0x"));
    }

    function test_should_fail_to_execute_dsa_tx_when_no_auth_is_given() public {
        prank(strategyExecutorAddr);
        vm.expectRevert();
        cut.callExecute(dsaProxyAddr, recipeExecutorAddr, bytes("0x"));
    }

    function test_should_execute_dsa_tx() public {
        // 1. Register DefiSaver connector so we can execute Recipes
        _addDefiSaverConnector();

        // 2. Approve auth contract so it can execute from dsa proxy account
        // This approval tx needs to be executed as part of DefiSaver recipe
        {
            bytes[] memory actionsCallData = new bytes[](1);
            actionsCallData[0] = handleAuthEncode(true);
            bytes4[] memory actionIds = new bytes4[](1);
            uint8[][] memory paramMapping = new uint8[][](1);
            paramMapping[0] = new uint8[](1);
            actionIds[0] = bytes4(keccak256("HandleAuth"));

            StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
                name: "HandleAuthRecipe",
                callData: actionsCallData,
                subData: new bytes32[](0),
                actionIds: actionIds,
                paramMapping: paramMapping
            });

            wallet.execute(
                recipeExecutorAddr,
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe),
                0
            );
        }

        // 3. Execute recipe once we have auth contract permission
        {
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

            // execute dsa tx
            prank(strategyExecutorAddr);
            cut.callExecute(dsaProxyAddr, recipeExecutorAddr, recipeExecutorCalldata);
        }
    }
}
