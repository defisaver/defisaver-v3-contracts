// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    StrategyPartialExecutionStorage
} from "../../contracts/core/strategy/StrategyPartialExecutionStorage.sol";
import { IDFSRegistry } from "../../contracts/interfaces/core/IDFSRegistry.sol";
import { ISubStorage } from "../../contracts/interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { DFSIds } from "../../contracts/utils/DFSIds.sol";

import { BaseTest } from "../utils/BaseTest.sol";

contract TestCore_StrategyPartialExecutionStorage is StrategyPartialExecutionStorage, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    StrategyPartialExecutionStorage cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 internal constant SUB_ID = 3113;
    uint256 internal constant STRATEGY_ID = 7;

    address subOwnerWallet;
    address adminVaultOwner;
    address strategyExecutor;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new StrategyPartialExecutionStorage();

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
    /// @dev Neither the sub owner nor the admin vault owner can approve, so no one can self-grant.
    function test_should_revert_when_approving_start_as_anyone_but_strategy_executor() public {
        vm.expectRevert(
            abi.encodeWithSelector(NotStrategyExecutor.selector, subOwnerWallet, strategyExecutor)
        );
        prank(subOwnerWallet);
        cut.approveStartOfExecution(SUB_ID);

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
        assertFalse(cut.isSubInPartialExecution(SUB_ID));

        _approveStart(SUB_ID);

        vm.expectEmit(true, true, true, true, address(cut));
        emit ExecutionStarted(SUB_ID, subOwnerWallet);

        prank(subOwnerWallet);
        cut.startExecution(SUB_ID, STRATEGY_ID);

        assertTrue(cut.isSubInPartialExecution(SUB_ID));
        assertEq(cut.getSubPartialExecutionWallet(SUB_ID), subOwnerWallet);

        (address wallet, uint256 initialStrategyId) = cut.getSubPartialExecutionState(SUB_ID);
        assertEq(wallet, subOwnerWallet);
        assertEq(initialStrategyId, STRATEGY_ID);
    }

    /// @dev The approval gate runs before the ownership check, so even the sub owner cannot
    ///      self-grant partial execution, and an approval only covers the sub it was given for.
    function test_should_revert_when_starting_execution_without_approval() public {
        vm.expectRevert(abi.encodeWithSelector(NotApproved.selector, SUB_ID, subOwnerWallet));
        prank(subOwnerWallet);
        cut.startExecution(SUB_ID, STRATEGY_ID);

        assertFalse(cut.isSubInPartialExecution(SUB_ID));

        _approveStart(SUB_ID);
        uint256 otherSubId = SUB_ID + 1;

        vm.expectRevert(abi.encodeWithSelector(NotApproved.selector, otherSubId, subOwnerWallet));
        prank(subOwnerWallet);
        cut.startExecution(otherSubId, STRATEGY_ID);

        assertFalse(cut.isSubInPartialExecution(otherSubId));
    }

    /// @dev Even with an approval, only the sub owner can start. The admin vault owner can end
    ///      an execution but not start one.
    function test_should_revert_when_starting_execution_as_non_owner_even_if_approved() public {
        _approveStart(SUB_ID);

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.startExecution(SUB_ID, STRATEGY_ID);

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, adminVaultOwner));
        prank(adminVaultOwner);
        cut.startExecution(SUB_ID, STRATEGY_ID);

        assertFalse(cut.isSubInPartialExecution(SUB_ID));
    }

    /// @dev The early return comes before any check, so a second start never overwrites the initial
    ///      strategy ID recorded by the first one, and does not revert for a non-owner either.
    function test_should_not_restart_execution_when_sub_is_already_in_partial_execution() public {
        _startExecution();

        // Sub owner starts again with a different strategy ID.
        prank(subOwnerWallet);
        cut.startExecution(SUB_ID, STRATEGY_ID + 1);

        (address wallet, uint256 initialStrategyId) = cut.getSubPartialExecutionState(SUB_ID);
        assertEq(wallet, subOwnerWallet);
        assertEq(initialStrategyId, STRATEGY_ID, "owner must not overwrite the strategy ID");

        // Non-owner of this sub starts with yet another strategy ID.
        // It does not revert and changes nothing because the sub is already in partial execution so the early return is hit.
        prank(bob);
        cut.startExecution(SUB_ID, STRATEGY_ID + 2);

        (wallet, initialStrategyId) = cut.getSubPartialExecutionState(SUB_ID);
        assertEq(wallet, subOwnerWallet, "non-owner must not take over the execution");
        assertEq(initialStrategyId, STRATEGY_ID, "non-owner must not overwrite the strategy ID");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                TESTS - endExecution
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Both the sub owner and the admin vault owner can end, the event logs the caller. The sub can
    ///      enter partial execution again after each end.
    function test_should_end_execution_as_sub_owner_and_admin_vault_owner() public {
        _startExecution();

        vm.expectEmit(true, true, true, true, address(cut));
        emit ExecutionEnded(SUB_ID, subOwnerWallet, subOwnerWallet);

        prank(subOwnerWallet);
        cut.endExecution(SUB_ID);

        _assertNotInPartialExecution();

        _startExecution();
        assertEq(cut.getSubPartialExecutionWallet(SUB_ID), subOwnerWallet);

        vm.expectEmit(true, true, true, true, address(cut));
        emit ExecutionEnded(SUB_ID, subOwnerWallet, adminVaultOwner);

        prank(adminVaultOwner);
        cut.endExecution(SUB_ID);

        _assertNotInPartialExecution();
    }

    /// @dev Only the admin vault owner is privileged, the vault admin is not.
    function test_should_revert_when_ending_execution_as_unauthorized_caller() public {
        address vaultAdmin = adminVault.admin();

        _startExecution();

        vm.expectRevert(abi.encodeWithSelector(NotAuthorized.selector, SUB_ID, bob));
        prank(bob);
        cut.endExecution(SUB_ID);

        vm.expectRevert(abi.encodeWithSelector(NotAuthorized.selector, SUB_ID, vaultAdmin));
        prank(vaultAdmin);
        cut.endExecution(SUB_ID);

        assertEq(cut.getSubPartialExecutionWallet(SUB_ID), subOwnerWallet);
    }

    /// @dev The early return comes before the auth check, so anyone can call it.
    function test_should_not_revert_when_ending_execution_that_is_not_started() public {
        assertFalse(cut.isSubInPartialExecution(SUB_ID));

        prank(bob);
        cut.endExecution(SUB_ID);

        assertFalse(cut.isSubInPartialExecution(SUB_ID));
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
        cut.startExecution(SUB_ID, STRATEGY_ID);
    }

    function _assertNotInPartialExecution() internal view {
        assertFalse(cut.isSubInPartialExecution(SUB_ID));
        assertEq(cut.getSubPartialExecutionWallet(SUB_ID), address(0));
    }
}
