// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SemiContinuousHelper } from "../../contracts/triggers/helpers/SemiContinuousHelper.sol";
import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { ISubStorage } from "../../contracts/interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";

contract SemiContinuousHelperHarness is SemiContinuousHelper {
    function shouldTriggerAnyway(uint256 _subId) external view returns (bool) {
        return _shouldTriggerAnyway(_subId);
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

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new SemiContinuousHelperHarness();
        tracker = new SemiContinuousTracker();

        redeploy("SemiContinuousTracker", address(tracker));

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(SUB_ID);
        subOwnerWallet = address(subData.walletAddr);
        assertTrue(subOwnerWallet != address(0));

        vm.label(subOwnerWallet, "SubOwnerWallet");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_true_when_caller_is_execution_wallet() public {
        _startExecutionForSub();

        prank(subOwnerWallet);
        bool shouldTrigger = cut.shouldTriggerAnyway(SUB_ID);

        assertTrue(shouldTrigger);
    }

    function test_should_return_false_for_random_caller_when_sub_is_in_execution() public {
        _startExecutionForSub();

        prank(bob);
        bool shouldTrigger = cut.shouldTriggerAnyway(SUB_ID);

        assertFalse(shouldTrigger);
    }

    function test_should_return_false_for_wallet_when_sub_is_not_in_execution() public {
        prank(subOwnerWallet);
        bool shouldTrigger = cut.shouldTriggerAnyway(SUB_ID);

        assertFalse(shouldTrigger);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _startExecutionForSub() internal {
        prank(subOwnerWallet);
        tracker.startExecution(SUB_ID);

        assertEq(tracker.executionWalletOf(SUB_ID), subOwnerWallet);
    }
}
