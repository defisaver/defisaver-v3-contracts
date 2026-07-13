// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SemiContinuousHelper } from "../../contracts/triggers/helpers/SemiContinuousHelper.sol";
import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { ISubStorage } from "../../contracts/interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";

contract SemiContinuousHelperHarness is SemiContinuousHelper {
    function isAlreadyInExecution(uint256 _subId) external view returns (bool) {
        return _isAlreadyInExecution(_subId);
    }
}

contract TestSemiContinuousHelper is RegistryUtils, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SemiContinuousHelperHarness cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 internal constant SUB_ID = 3113;

    SemiContinuousTracker tracker;
    address subOwnerWallet;
    address stvnrAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new SemiContinuousHelperHarness();
        tracker = new SemiContinuousTracker();
        stvnrAddr = makeAddr("STVNR");

        redeploy("SemiContinuousTracker", address(tracker));
        redeploy("StrategyTriggerViewNoRevert", stvnrAddr);

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(SUB_ID);
        subOwnerWallet = address(subData.walletAddr);
        assertTrue(subOwnerWallet != address(0));

        vm.label(subOwnerWallet, "SubOwnerWallet");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_true_when_caller_is_stored_wallet() public {
        _storeWalletForSub();

        prank(subOwnerWallet);
        bool inExecution = cut.isAlreadyInExecution(SUB_ID);

        assertTrue(inExecution);
    }

    function test_should_return_true_for_stvnr_when_sub_is_stored() public {
        _storeWalletForSub();

        prank(stvnrAddr);
        bool inExecution = cut.isAlreadyInExecution(SUB_ID);

        assertTrue(inExecution);
    }

    function test_should_return_false_for_random_caller_when_sub_is_stored() public {
        _storeWalletForSub();

        prank(bob);
        bool inExecution = cut.isAlreadyInExecution(SUB_ID);

        assertFalse(inExecution);
    }

    function test_should_return_false_for_wallet_when_sub_is_not_stored() public {
        prank(subOwnerWallet);
        bool inExecution = cut.isAlreadyInExecution(SUB_ID);

        assertFalse(inExecution);
    }

    function test_should_return_false_for_stvnr_when_sub_is_not_stored() public {
        prank(stvnrAddr);
        bool inExecution = cut.isAlreadyInExecution(SUB_ID);

        assertFalse(inExecution);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _storeWalletForSub() internal {
        prank(subOwnerWallet);
        tracker.setSubToWallet(SUB_ID);

        assertEq(tracker.getWalletForSub(SUB_ID), subOwnerWallet);
    }
}
