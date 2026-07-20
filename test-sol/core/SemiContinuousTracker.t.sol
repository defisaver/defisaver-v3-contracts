// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { ISubStorage } from "../../contracts/interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";

import { Vm } from "forge-std/Vm.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestCore_SemiContinuousTracker is SemiContinuousTracker, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SemiContinuousTracker cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 internal constant SUB_ID = 3113;

    address subOwnerWallet;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new SemiContinuousTracker();

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(SUB_ID);
        subOwnerWallet = address(subData.walletAddr);
        assertTrue(subOwnerWallet != address(0));

        vm.label(subOwnerWallet, "SubOwnerWallet");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_start_execution() public {
        assertFalse(cut.isInExecution(SUB_ID));

        vm.expectEmit(true, true, false, true, address(cut));
        emit ExecutionStarted(SUB_ID, subOwnerWallet);

        prank(subOwnerWallet);
        cut.startExecution(SUB_ID);

        assertTrue(cut.isInExecution(SUB_ID));
        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    function test_should_return_early_when_sub_already_in_execution() public {
        _startExecution();

        vm.recordLogs();
        prank(subOwnerWallet);
        cut.startExecution(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    function test_should_revert_for_non_owner_even_when_sub_already_in_execution() public {
        _startExecution();

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.startExecution(SUB_ID);

        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    function test_should_revert_when_starting_execution_for_non_owner() public {
        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.startExecution(SUB_ID);
    }

    function test_should_finish_execution() public {
        _startExecution();

        vm.expectEmit(true, true, false, true, address(cut));
        emit ExecutionFinished(SUB_ID, subOwnerWallet);

        prank(subOwnerWallet);
        cut.finishExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
        assertEq(cut.executionWalletOf(SUB_ID), address(0));
    }

    function test_should_return_early_when_finishing_execution_that_is_not_started() public {
        assertFalse(cut.isInExecution(SUB_ID));

        vm.recordLogs();
        prank(subOwnerWallet);
        cut.finishExecution(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_revert_for_non_owner_even_when_execution_is_not_started() public {
        assertFalse(cut.isInExecution(SUB_ID));

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.finishExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_revert_when_finishing_execution_for_non_owner() public {
        _startExecution();

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.finishExecution(SUB_ID);
    }

    function test_should_start_execution_again_after_finish() public {
        _startExecution();

        prank(subOwnerWallet);
        cut.finishExecution(SUB_ID);
        assertFalse(cut.isInExecution(SUB_ID));

        _startExecution();

        assertTrue(cut.isInExecution(SUB_ID));
        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _startExecution() internal {
        prank(subOwnerWallet);
        cut.startExecution(SUB_ID);
    }
}
