// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { IDFSRegistry } from "../../contracts/interfaces/core/IDFSRegistry.sol";
import { ISubStorage } from "../../contracts/interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { DFSIds } from "../../contracts/utils/DFSIds.sol";

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
    address adminVaultOwner;
    address strategyExecutor;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new SemiContinuousTracker();

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(SUB_ID);
        subOwnerWallet = address(subData.walletAddr);
        assertTrue(subOwnerWallet != address(0));

        adminVaultOwner = adminVault.owner();
        assertTrue(adminVaultOwner != address(0));

        /// @dev Approval to start execution can only be given by the registered StrategyExecutor.
        strategyExecutor = IDFSRegistry(REGISTRY_ADDR).getAddr(DFSIds.STRATEGY_EXECUTOR);
        assertTrue(strategyExecutor != address(0));

        vm.label(subOwnerWallet, "SubOwnerWallet");
        vm.label(adminVaultOwner, "AdminVaultOwner");
        vm.label(strategyExecutor, "StrategyExecutor");
    }

    /*//////////////////////////////////////////////////////////////////////////
                          TESTS - approveStartOfExecution
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_revert_when_approving_start_as_non_strategy_executor() public {
        vm.expectRevert(abi.encodeWithSelector(NotStrategyExecutor.selector, bob, strategyExecutor));
        prank(bob);
        cut.approveStartOfExecution(SUB_ID);
    }

    function test_should_revert_when_approving_start_as_sub_owner() public {
        vm.expectRevert(
            abi.encodeWithSelector(NotStrategyExecutor.selector, subOwnerWallet, strategyExecutor)
        );
        prank(subOwnerWallet);
        cut.approveStartOfExecution(SUB_ID);
    }

    function test_should_revert_when_approving_start_as_admin_vault_owner() public {
        vm.expectRevert(
            abi.encodeWithSelector(NotStrategyExecutor.selector, adminVaultOwner, strategyExecutor)
        );
        prank(adminVaultOwner);
        cut.approveStartOfExecution(SUB_ID);
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - startExecution
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_start_execution() public {
        assertFalse(cut.isInExecution(SUB_ID));

        _approveStart(SUB_ID);

        vm.expectEmit(true, true, true, true, address(cut));
        emit ExecutionStarted(SUB_ID, subOwnerWallet);

        prank(subOwnerWallet);
        cut.startExecution(SUB_ID);

        assertTrue(cut.isInExecution(SUB_ID));
        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    /// @dev The approval gate runs before the ownership check, so an unapproved sub owner
    ///      cannot self-grant semi-continuous execution.
    function test_should_revert_when_starting_execution_without_approval() public {
        vm.expectRevert(abi.encodeWithSelector(NotApproved.selector, SUB_ID, subOwnerWallet));
        prank(subOwnerWallet);
        cut.startExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_revert_when_starting_execution_without_approval_for_non_owner() public {
        vm.expectRevert(abi.encodeWithSelector(NotApproved.selector, SUB_ID, bob));
        prank(bob);
        cut.startExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_revert_when_starting_execution_without_approval_as_admin_vault_owner()
        public
    {
        vm.expectRevert(abi.encodeWithSelector(NotApproved.selector, SUB_ID, adminVaultOwner));
        prank(adminVaultOwner);
        cut.startExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_revert_when_starting_execution_for_a_different_sub_than_approved() public {
        _approveStart(SUB_ID);

        uint256 otherSubId = SUB_ID + 1;

        vm.expectRevert(abi.encodeWithSelector(NotApproved.selector, otherSubId, subOwnerWallet));
        prank(subOwnerWallet);
        cut.startExecution(otherSubId);

        assertFalse(cut.isInExecution(otherSubId));
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

    function test_should_not_revert_for_non_owner_when_sub_already_in_execution() public {
        _startExecution();

        vm.recordLogs();
        prank(bob);
        cut.startExecution(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    function test_should_revert_when_admin_vault_owner_starts_execution_even_if_approved() public {
        _approveStart(SUB_ID);

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, adminVaultOwner));
        prank(adminVaultOwner);
        cut.startExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_revert_when_starting_execution_for_non_owner_even_if_approved() public {
        _approveStart(SUB_ID);

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.startExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - finishExecution
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_finish_execution() public {
        _startExecution();

        vm.expectEmit(true, true, true, true, address(cut));
        emit ExecutionFinished(SUB_ID, subOwnerWallet, subOwnerWallet);

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

    function test_should_revert_when_finishing_execution_for_non_owner() public {
        _startExecution();

        vm.expectRevert(abi.encodeWithSelector(NotAuthorized.selector, SUB_ID, bob));
        prank(bob);
        cut.finishExecution(SUB_ID);
    }

    function test_should_finish_execution_as_admin_vault_owner() public {
        _startExecution();

        // event logs the caller, which is the admin and not the sub owner wallet
        vm.expectEmit(true, true, true, true, address(cut));
        emit ExecutionFinished(SUB_ID, subOwnerWallet, adminVaultOwner);

        prank(adminVaultOwner);
        cut.finishExecution(SUB_ID);

        assertFalse(cut.isInExecution(SUB_ID));
        assertEq(cut.executionWalletOf(SUB_ID), address(0));
    }

    function test_should_revert_when_admin_vault_admin_finishes_execution() public {
        address vaultAdmin = adminVault.admin();

        _startExecution();

        vm.expectRevert(abi.encodeWithSelector(NotAuthorized.selector, SUB_ID, vaultAdmin));
        prank(vaultAdmin);
        cut.finishExecution(SUB_ID);

        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
    }

    function test_should_not_revert_for_non_owner_when_execution_is_not_started() public {
        assertFalse(cut.isInExecution(SUB_ID));

        vm.recordLogs();
        prank(bob);
        cut.finishExecution(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertFalse(cut.isInExecution(SUB_ID));
    }

    function test_should_not_revert_for_admin_when_execution_is_not_started() public {
        assertFalse(cut.isInExecution(SUB_ID));

        vm.recordLogs();
        prank(adminVaultOwner);
        cut.finishExecution(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertFalse(cut.isInExecution(SUB_ID));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - RESTART
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_start_execution_again_after_admin_vault_owner_finish() public {
        _startExecution();

        prank(adminVaultOwner);
        cut.finishExecution(SUB_ID);
        assertFalse(cut.isInExecution(SUB_ID));

        _startExecution();

        assertTrue(cut.isInExecution(SUB_ID));
        assertEq(cut.executionWalletOf(SUB_ID), subOwnerWallet);
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
    /// @dev Mirrors what StrategyExecutorCommon._callActions does before handing over to
    ///      RecipeExecutor: the registered StrategyExecutor approves the start for this subId.
    function _approveStart(uint256 _subId) internal {
        prank(strategyExecutor);
        cut.approveStartOfExecution(_subId);
    }

    function _startExecution() internal {
        _approveStart(SUB_ID);

        prank(subOwnerWallet);
        cut.startExecution(SUB_ID);
    }
}
