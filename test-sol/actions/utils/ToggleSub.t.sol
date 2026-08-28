// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ToggleSub } from "../../../contracts/actions/utils/ToggleSub.sol";
import { ActionBase } from "../../../contracts/actions/ActionBase.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import { SemiContinuousTracker } from "../../../contracts/core/strategy/SemiContinuousTracker.sol";
import { ISafe } from "../../../contracts/interfaces/protocols/safe/ISafe.sol";
import { IDSProxy } from "../../../contracts/interfaces/DS/IDSProxy.sol";

import { SubActionsBase } from "../../utils/SubActionsBase.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { stdError } from "forge-std/StdError.sol";

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
        assertFalse(tracker.isInExecution(subId));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(subStorage.getSub(subId).isEnabled);
        assertFalse(tracker.isInExecution(subId));
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

    /// @dev When the sub is in execution the tracker's NotAuthorized check fires first, masking
    ///      SubStorage's SenderNotSubOwnerError. Same outcome, less obvious error.
    function test_should_revert_when_deactivating_in_execution_sub_of_another_owner() public {
        _startExecution(subId);

        SmartWallet otherWallet = new SmartWallet(alice);

        // SemiContinuousTracker::NotAuthorized
        vm.expectRevert();
        _toggle(otherWallet, subId, false, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
        assertTrue(tracker.isInExecution(subId), "tracker must stay untouched");
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

    /// @dev Same call on a sub that is in execution: the tracker rejects it before SubStorage does.
    function test_should_revert_with_not_authorized_when_called_without_a_wallet_in_execution()
        public
    {
        _startExecution(subId);

        vm.expectRevert(
            abi.encodeWithSelector(
                SemiContinuousTracker.NotAuthorized.selector, subId, address(cut)
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
                          TESTS - SEMI-CONTINUOUS INTERACTION
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_clear_semi_continuous_execution_on_deactivate() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(tracker.isInExecution(subId), "deactivate must clear the tracker");
        assertEq(tracker.executionWalletOf(subId), address(0));
        assertFalse(subStorage.getSub(subId).isEnabled);
    }

    function test_should_deactivate_again_after_semi_continuous_execution_was_cleared() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(tracker.isInExecution(subId), "deactivate must clear the tracker");
        assertEq(tracker.executionWalletOf(subId), address(0));
        assertFalse(subStorage.getSub(subId).isEnabled);

        /// @dev No ExecutionFinished this time, finishExecution early-returns.
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, false);

        assertFalse(tracker.isInExecution(subId), "tracker must stay cleared");
        assertEq(tracker.executionWalletOf(subId), address(0));
        assertFalse(subStorage.getSub(subId).isEnabled, "sub must stay disabled");
    }

    function test_should_clear_semi_continuous_execution_on_deactivate_direct() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.DeactivateSub(subId);
        _toggle(wallet, subId, false, true);

        assertFalse(tracker.isInExecution(subId), "deactivate must clear the tracker");
    }

    /// @dev Documents current behaviour: only the deactivate branch clears the tracker, so a
    ///      flag that is still set when the sub is re-enabled keeps bypassing triggers.
    function test_activate_does_not_clear_semi_continuous_execution() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        assertTrue(
            tracker.isInExecution(subId),
            "activate leaves the tracker set, only the deactivate branch clears it"
        );
    }

    /// @dev The tracker is a hard dependency of the deactivate path. If it is not registered
    ///      the user cannot disable their subscription at all.
    function test_should_revert_on_deactivate_when_tracker_is_not_registered() public {
        redeploy("SemiContinuousTracker", address(0));

        vm.expectRevert();
        _toggle(wallet, subId, false, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub could not be disabled");
    }

    /// @dev The activate path never touches the tracker, so it keeps working regardless.
    function test_should_activate_when_tracker_is_not_registered() public {
        _toggle(wallet, subId, false, false);
        redeploy("SemiContinuousTracker", address(0));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.ActivateSub(subId);
        _toggle(wallet, subId, true, false);

        assertTrue(subStorage.getSub(subId).isEnabled);
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
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _toggle(SmartWallet _wallet, uint256 _subId, bool _active, bool _isDirect) internal {
        _wallet.execute(
            address(cut), executeActionCalldata(toggleSubEncode(_subId, _active), _isDirect), 0
        );
    }
}
