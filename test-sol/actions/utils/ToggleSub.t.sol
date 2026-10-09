// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ToggleSub } from "../../../contracts/actions/utils/ToggleSub.sol";
import { ActionBase } from "../../../contracts/actions/ActionBase.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import {
    IStrategyPartialExecutionStorage
} from "../../../contracts/core/strategy/StrategyPartialExecutionStorage.sol";
import { ISafe } from "../../../contracts/interfaces/protocols/safe/ISafe.sol";
import { IDSProxy } from "../../../contracts/interfaces/DS/IDSProxy.sol";

import { SubActionsBase } from "../../utils/SubActionsBase.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { stdError } from "forge-std/StdError.sol";
import { Vm } from "forge-std/Vm.sol";

contract TestToggleSub is SubActionsBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    ToggleSub cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;

    uint256 subId;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();

        cut = new ToggleSub();
        _setUpSubActions();

        subId = _subscribe(wallet);
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - BASIC TOGGLING
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_deactivate_sub() public {
        assertTrue(subStorage.getSub(subId).isEnabled);
        assertFalse(partialExecutionStorage.isInPartialExecution(subId));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(subStorage.getSub(subId).isEnabled);
        assertFalse(partialExecutionStorage.isInPartialExecution(subId));
    }

    function test_should_deactivate_sub_direct() public {
        assertTrue(subStorage.getSub(subId).isEnabled);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, true);

        assertFalse(subStorage.getSub(subId).isEnabled);
    }

    function test_should_activate_sub() public {
        _toggle(wallet, subId, false, false);
        assertFalse(subStorage.getSub(subId).isEnabled);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        assertTrue(subStorage.getSub(subId).isEnabled);
    }

    function test_should_activate_sub_direct() public {
        _toggle(wallet, subId, false, true);
        assertFalse(subStorage.getSub(subId).isEnabled);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, true);

        assertTrue(subStorage.getSub(subId).isEnabled);
    }

    /// @dev The redundant toggles still write and still emit, they are not short-circuited.
    function test_should_be_idempotent_when_toggling_twice_to_the_same_state() public {
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);
        assertFalse(subStorage.getSub(subId).isEnabled);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);
        assertTrue(subStorage.getSub(subId).isEnabled);
    }

    function test_action_type_should_be_standard_action() public view {
        assertEq(cut.actionType(), uint8(ActionBase.ActionType.STANDARD_ACTION));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - OWNERSHIP
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_revert_when_deactivating_sub_of_another_owner() public {
        SmartWallet otherWallet = new SmartWallet(alice);

        // SubStorage::SenderNotSubOwnerError
        vm.expectRevert();
        _toggle(otherWallet, subId, false, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
    }

    function test_should_revert_when_activating_sub_of_another_owner() public {
        _toggle(wallet, subId, false, false);

        SmartWallet otherWallet = new SmartWallet(alice);

        // SubStorage::SenderNotSubOwnerError
        vm.expectRevert();
        _toggle(otherWallet, subId, true, false);

        assertFalse(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
    }

    /// @dev When the sub is in partial execution the partial execution storage's NotAuthorized check fires first, masking
    ///      SubStorage's SenderNotSubOwnerError. Same outcome, less obvious error.
    function test_should_revert_when_deactivating_in_partial_execution_sub_of_another_owner()
        public
    {
        _startExecution(subId);

        SmartWallet otherWallet = new SmartWallet(alice);

        // StrategyPartialExecutionStorage::NotAuthorized
        vm.expectRevert();
        _toggle(otherWallet, subId, false, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
        assertTrue(
            partialExecutionStorage.isInPartialExecution(subId),
            "partial execution storage must stay untouched"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                       TESTS - EXACT ERRORS (NO WALLET IN THE WAY)
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The action holds no auth of its own, it relies on being delegatecalled by the owner
    ///      wallet. Called directly, msg.sender stays the action itself, so SubStorage rejects it.
    ///      No wallet swallows the revert data here, so the exact error can be matched.
    function test_should_revert_with_sender_not_sub_owner_when_called_without_a_wallet() public {
        vm.expectRevert(
            abi.encodeWithSelector(SubStorage.SenderNotSubOwnerError.selector, address(cut), subId)
        );
        cut.executeActionDirect(toggleSubEncode(subId, false));
    }

    /// @dev Same call on a sub that is in partial execution: the partial execution storage rejects it before SubStorage does.
    function test_should_revert_with_not_authorized_when_called_without_a_wallet_in_partial_execution()
        public
    {
        _startExecution(subId);

        vm.expectRevert(
            abi.encodeWithSelector(
                IStrategyPartialExecutionStorage.NotAuthorized.selector, subId, address(cut)
            )
        );
        cut.executeActionDirect(toggleSubEncode(subId, false));
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - NON-EXISTENT SUB
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev onlySubOwner indexes strategiesSubs before comparing the owner, so an id past the end
    ///      of the array panics with an out-of-bounds access instead of SenderNotSubOwnerError.
    function test_should_panic_on_non_existent_sub_when_called_without_a_wallet() public {
        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert(stdError.indexOOBError);
        cut.executeActionDirect(toggleSubEncode(nonExistentSubId, false));
    }

    // SubStorage array out-of-bounds panic
    function test_should_revert_when_deactivating_non_existent_sub() public {
        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert();
        _toggle(wallet, nonExistentSubId, false, false);

        assertEq(subStorage.getSubsCount(), nonExistentSubId, "no sub must be created");
    }

    // SubStorage array out-of-bounds panic
    function test_should_revert_when_activating_non_existent_sub() public {
        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert();
        _toggle(wallet, nonExistentSubId, true, false);

        assertEq(subStorage.getSubsCount(), nonExistentSubId, "no sub must be created");
    }

    /*//////////////////////////////////////////////////////////////////////////
                            TESTS - AUTH PERMISSION ON ACTIVATE
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Activating re-grants the auth contract permission so the bot can execute again.
    function test_should_enable_auth_module_on_activate() public {
        prank(walletAddr);
        ISafe(walletAddr).disableModule(address(0x1), MODULE_AUTH_ADDR);
        assertFalse(ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        assertTrue(
            ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR), "auth module must be re-enabled"
        );
    }

    /// @dev Deactivating must NOT touch the auth permission.
    function test_should_not_touch_auth_module_on_deactivate() public {
        assertTrue(ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertTrue(ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR));
    }

    /*//////////////////////////////////////////////////////////////////////////
                       TESTS - PARTIAL EXECUTION INTERACTION
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_clear_partial_execution_on_deactivate() public {
        _startExecution(subId);
        assertTrue(partialExecutionStorage.isInPartialExecution(subId));

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(
            partialExecutionStorage.isInPartialExecution(subId),
            "deactivate must clear the partial execution storage"
        );
        assertEq(partialExecutionStorage.getPartialExecutionWallet(subId), address(0));
        assertFalse(subStorage.getSub(subId).isEnabled);
    }

    function test_should_deactivate_again_after_partial_execution_was_cleared() public {
        _startExecution(subId);
        assertTrue(partialExecutionStorage.isInPartialExecution(subId));

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(
            partialExecutionStorage.isInPartialExecution(subId),
            "deactivate must clear the partial execution storage"
        );
        assertEq(partialExecutionStorage.getPartialExecutionWallet(subId), address(0));
        assertFalse(subStorage.getSub(subId).isEnabled);

        /// @dev No ExecutionEnded this time, endExecution early-returns.
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(
            partialExecutionStorage.isInPartialExecution(subId),
            "partial execution storage must stay cleared"
        );
        assertEq(partialExecutionStorage.getPartialExecutionWallet(subId), address(0));
        assertFalse(subStorage.getSub(subId).isEnabled, "sub must stay disabled");
    }

    function test_should_clear_partial_execution_on_deactivate_direct() public {
        _startExecution(subId);
        assertTrue(partialExecutionStorage.isInPartialExecution(subId));

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, true);

        assertFalse(
            partialExecutionStorage.isInPartialExecution(subId),
            "deactivate must clear the partial execution storage"
        );
    }

    /// @dev Both branches clear the partial execution storage, so a flag that is still set can't keep bypassing
    ///      triggers once the sub is re-enabled.
    function test_should_clear_partial_execution_on_activate() public {
        _startExecution(subId);
        assertTrue(partialExecutionStorage.isInPartialExecution(subId));

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        assertFalse(
            partialExecutionStorage.isInPartialExecution(subId),
            "activate must clear the partial execution storage"
        );
        assertEq(partialExecutionStorage.getPartialExecutionWallet(subId), address(0));
        assertTrue(subStorage.getSub(subId).isEnabled);
    }

    /// @dev The partial execution storage is a hard dependency of the deactivate path. If it is not registered
    ///      the user cannot disable their subscription at all.
    function test_should_revert_on_deactivate_when_partial_execution_storage_is_not_registered()
        public
    {
        redeploy("StrategyPartialExecutionStorage", address(0));

        vm.expectRevert();
        _toggle(wallet, subId, false, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub could not be disabled");
    }

    /// @dev The activate path calls the partial execution storage too, so it is a hard dependency there as well.
    function test_should_revert_on_activate_when_partial_execution_storage_is_not_registered()
        public
    {
        _toggle(wallet, subId, false, false);
        redeploy("StrategyPartialExecutionStorage", address(0));

        vm.expectRevert();
        _toggle(wallet, subId, true, false);

        assertFalse(subStorage.getSub(subId).isEnabled, "sub could not be enabled");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                TESTS - DS PROXY WALLET
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_toggle_sub_for_ds_proxy_wallet() public {
        SmartWallet dsProxyWallet = new SmartWallet(charlie);
        dsProxyWallet.createDSProxy();

        uint256 dsSubId = _subscribe(dsProxyWallet);
        assertTrue(subStorage.getSub(dsSubId).isEnabled);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(dsSubId);
        _toggle(dsProxyWallet, dsSubId, false, false);
        assertFalse(subStorage.getSub(dsSubId).isEnabled);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(dsSubId);
        _toggle(dsProxyWallet, dsSubId, true, false);
        assertTrue(subStorage.getSub(dsSubId).isEnabled);
    }

    /// @dev DSProxy.execute returns the action's response, so the return value can be asserted.
    function test_should_return_sub_id() public {
        SmartWallet dsProxyWallet = new SmartWallet(charlie);
        address dsProxyAddr = dsProxyWallet.createDSProxy();

        uint256 dsSubId = _subscribe(dsProxyWallet);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(dsSubId);

        prank(dsProxyWallet.owner());
        bytes32 response = IDSProxy(dsProxyAddr)
            .execute(address(cut), executeActionCalldata(toggleSubEncode(dsSubId, false), false));

        assertEq(uint256(response), dsSubId, "executeAction must return the subId");
    }

    /*//////////////////////////////////////////////////////////////////////////
               TESTS - TWO SUBS, PARTIAL EXECUTION STORAGE ISOLATION
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev endExecution is keyed by subId, so toggling one sub must leave every other
    ///      sub of the same owner in partial execution.
    function test_should_clear_only_the_deactivated_sub_when_both_are_in_partial_execution()
        public
    {
        uint256 secondSubId = _subscribe(wallet);
        _startExecution(subId);
        _startExecution(secondSubId);

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        _assertNotInPartialExecution(subId);
        assertFalse(subStorage.getSub(subId).isEnabled);

        _assertInPartialExecution(secondSubId, walletAddr);
        assertTrue(subStorage.getSub(secondSubId).isEnabled, "other sub must stay enabled");
    }

    /// @dev Stronger form of the above: exactly one ExecutionEnded is emitted, for the
    ///      toggled sub, so the second sub is not silently ended too.
    function test_should_emit_execution_ended_only_for_the_deactivated_sub() public {
        uint256 secondSubId = _subscribe(wallet);
        _startExecution(subId);
        _startExecution(secondSubId);

        vm.recordLogs();
        _toggle(wallet, subId, false, false);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint256 endedCount;
        for (uint256 i = 0; i < logs.length; ++i) {
            if (logs[i].emitter != address(partialExecutionStorage)) continue;
            if (logs[i].topics[0] != IStrategyPartialExecutionStorage.ExecutionEnded.selector) {
                continue;
            }

            endedCount++;
            assertEq(uint256(logs[i].topics[1]), subId, "only the toggled sub may be ended");
        }

        assertEq(endedCount, 1, "exactly one ExecutionEnded must be emitted");
    }

    /// @dev Deactivating a sub that was never in partial execution hits endExecution's early return
    ///      and must not reach into the other sub's entry.
    function test_should_not_touch_in_partial_execution_sub_when_deactivating_an_idle_sub() public {
        uint256 secondSubId = _subscribe(wallet);
        _startExecution(secondSubId);

        _assertNotInPartialExecution(subId);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        _assertNotInPartialExecution(subId);
        _assertInPartialExecution(secondSubId, walletAddr);
        assertTrue(subStorage.getSub(secondSubId).isEnabled, "other sub must stay enabled");
    }

    /// @dev A full deactivate/activate cycle on the idle sub leaves the other sub's entry alone.
    function test_should_not_touch_in_partial_execution_sub_through_a_toggle_cycle_of_another_sub()
        public
    {
        uint256 secondSubId = _subscribe(wallet);
        _startExecution(secondSubId);

        _toggle(wallet, subId, false, false);
        _assertInPartialExecution(secondSubId, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        assertTrue(subStorage.getSub(subId).isEnabled);
        _assertNotInPartialExecution(subId);
        _assertInPartialExecution(secondSubId, walletAddr);
        assertTrue(subStorage.getSub(secondSubId).isEnabled, "other sub must stay enabled");
    }

    /// @dev Isolation also holds across owners: bob deactivating his sub cannot clear the entry
    ///      of alice's sub, which is in partial execution for a different wallet.
    function test_should_not_touch_in_partial_execution_sub_of_another_owner() public {
        SmartWallet otherWallet = new SmartWallet(alice);
        address otherWalletAddr = otherWallet.walletAddr();
        uint256 otherSubId = _subscribe(otherWallet);

        _startExecution(subId);
        _startExecution(otherSubId);

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);
        _toggle(wallet, subId, false, false);

        _assertNotInPartialExecution(subId);
        _assertInPartialExecution(otherSubId, otherWalletAddr);
        assertTrue(subStorage.getSub(otherSubId).isEnabled, "other owner's sub must stay enabled");
    }

    /// @dev A reverted toggle of someone else's sub leaves both partial executions as they were.
    function test_should_not_clear_any_partial_execution_when_toggling_another_owners_sub_reverts()
        public
    {
        SmartWallet otherWallet = new SmartWallet(alice);
        address otherWalletAddr = otherWallet.walletAddr();
        uint256 otherSubId = _subscribe(otherWallet);

        _startExecution(subId);
        _startExecution(otherSubId);

        // StrategyPartialExecutionStorage::NotAuthorized
        vm.expectRevert();
        _toggle(wallet, otherSubId, false, false);

        _assertInPartialExecution(subId, walletAddr);
        _assertInPartialExecution(otherSubId, otherWalletAddr);
        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
        assertTrue(subStorage.getSub(otherSubId).isEnabled, "sub must stay untouched");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _toggle(SmartWallet _wallet, uint256 _subId, bool _active, bool _isDirect) internal {
        _wallet.execute(
            address(cut), executeActionCalldata(toggleSubEncode(_subId, _active), _isDirect), 0
        );
    }

    function _assertInPartialExecution(uint256 _subId, address _wallet) internal view {
        assertTrue(
            partialExecutionStorage.isInPartialExecution(_subId), "sub must be in partial execution"
        );
        assertEq(
            partialExecutionStorage.getPartialExecutionWallet(_subId),
            _wallet,
            "wrong partial execution wallet"
        );
    }

    function _assertNotInPartialExecution(uint256 _subId) internal view {
        assertFalse(
            partialExecutionStorage.isInPartialExecution(_subId),
            "sub must not be in partial execution"
        );
        assertEq(
            partialExecutionStorage.getPartialExecutionWallet(_subId),
            address(0),
            "partial execution wallet must be cleared"
        );
    }
}
