// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ToggleSub } from "../../../contracts/actions/utils/ToggleSub.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import {
    IStrategyPartialExecutionStorage
} from "../../../contracts/core/strategy/StrategyPartialExecutionStorage.sol";
import { ISafe } from "../../../contracts/interfaces/protocols/safe/ISafe.sol";

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
                                  TESTS - TOGGLING
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_toggle_sub() public {
        assertTrue(subStorage.getSub(subId).isEnabled);

        // Through executeAction (delegatecall from the wallet).
        _toggleAndAssert(false, false);
        _toggleAndAssert(true, false);

        // Through executeActionDirect.
        _toggleAndAssert(false, true);
        _toggleAndAssert(true, true);

        // Redundant toggles to the same state still write and still emit, they are not short-circuited.
        _toggleAndAssert(true, false);
        _toggleAndAssert(false, false);
        _toggleAndAssert(false, false);
    }

    /// @dev Activating re-grants the auth contract permission so the bot can execute again,
    ///      deactivating must not grant it.
    function test_should_re_enable_auth_module_only_on_activate() public {
        prank(walletAddr);
        ISafe(walletAddr).disableModule(address(0x1), MODULE_AUTH_ADDR);
        assertFalse(ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR));

        _toggle(wallet, subId, false, false);
        assertFalse(
            ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR),
            "deactivate must not touch the auth module"
        );

        _toggle(wallet, subId, true, false);
        assertTrue(
            ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDR), "auth module must be re-enabled"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - OWNERSHIP
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The wallet swallows the revert data, so the exact errors are checked in the test below.
    function test_should_revert_when_toggling_sub_of_another_owner() public {
        SmartWallet otherWallet = new SmartWallet(alice);

        // SubStorage::SenderNotSubOwnerError
        vm.expectRevert();
        _toggle(otherWallet, subId, false, false);
        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay untouched");

        _toggle(wallet, subId, false, false);

        // SubStorage::SenderNotSubOwnerError
        vm.expectRevert();
        _toggle(otherWallet, subId, true, false);
        assertFalse(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
    }

    /// @dev The action holds no auth of its own, it relies on being delegatecalled by the owner
    ///      wallet. Called directly, msg.sender stays the action itself, so it is rejected. No wallet
    ///      swallows the revert data here, so the exact errors can be matched.
    function test_should_revert_with_exact_errors_when_called_without_a_wallet() public {
        vm.expectRevert(
            abi.encodeWithSelector(SubStorage.SenderNotSubOwnerError.selector, address(cut), subId)
        );
        cut.executeActionDirect(toggleSubEncode(subId, false));

        // When the sub is in partial execution the partial execution storage rejects the call
        // before SubStorage does.
        _startExecution(subId);

        vm.expectRevert(
            abi.encodeWithSelector(
                IStrategyPartialExecutionStorage.NotAuthorized.selector, subId, address(cut)
            )
        );
        cut.executeActionDirect(toggleSubEncode(subId, false));
    }

    /// @dev onlySubOwner indexes strategiesSubs before comparing the owner, so an id past the end
    ///      of the array panics with an out-of-bounds access instead of SenderNotSubOwnerError.
    function test_should_panic_on_non_existent_sub() public {
        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert(stdError.indexOOBError);
        cut.executeActionDirect(toggleSubEncode(nonExistentSubId, false));
    }

    /*//////////////////////////////////////////////////////////////////////////
                       TESTS - PARTIAL EXECUTION INTERACTION
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Both branches clear the partial execution storage, so a flag that is still set can't keep
    ///      bypassing triggers once the sub is re-enabled. Covers every active/direct combination.
    function test_should_clear_partial_execution_on_toggle() public {
        _toggleAndAssertPartialExecutionCleared(false, false);
        _toggleAndAssertPartialExecutionCleared(true, false);
        _toggleAndAssertPartialExecutionCleared(false, true);
        _toggleAndAssertPartialExecutionCleared(true, true);
    }

    /// @dev endExecution is keyed by subId, so toggling one sub must end only that sub's partial execution,
    ///      leaving both the same owner's other sub and another owner's sub untouched.
    function test_should_end_execution_only_for_the_toggled_sub() public {
        uint256 secondSubId = _subscribe(wallet);

        SmartWallet otherWallet = new SmartWallet(alice);
        address otherWalletAddr = otherWallet.walletAddr();
        uint256 otherSubId = _subscribe(otherWallet);

        _startExecution(subId);
        _startExecution(secondSubId);
        _startExecution(otherSubId);

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);
        _toggle(wallet, subId, false, false);

        _assertNotInPartialExecution(subId);
        assertFalse(subStorage.getSub(subId).isEnabled);

        _assertInPartialExecution(secondSubId, walletAddr);
        assertTrue(subStorage.getSub(secondSubId).isEnabled, "other sub must stay enabled");

        _assertInPartialExecution(otherSubId, otherWalletAddr);
        assertTrue(subStorage.getSub(otherSubId).isEnabled, "other owner's sub must stay enabled");
    }

    /// @dev Toggling a sub that was never in partial execution hits endExecution's early return
    ///      and must not reach into the other sub's entry.
    function test_should_not_touch_other_subs_partial_execution_when_toggling_an_idle_sub() public {
        uint256 secondSubId = _subscribe(wallet);
        _startExecution(secondSubId);
        _assertNotInPartialExecution(subId);

        _toggle(wallet, subId, false, false);
        _toggle(wallet, subId, true, false);

        assertTrue(subStorage.getSub(subId).isEnabled);
        _assertNotInPartialExecution(subId);
        _assertInPartialExecution(secondSubId, walletAddr);
        assertTrue(subStorage.getSub(secondSubId).isEnabled, "other sub must stay enabled");
    }

    /// @dev The partial execution storage is a hard dependency of both toggle paths, endExecution is
    ///      called before the activate/deactivate branch. If it is not registered the user cannot
    ///      disable their subscription at all.
    function test_should_revert_when_partial_execution_storage_is_not_registered() public {
        redeploy("StrategyPartialExecutionStorage", address(0));

        vm.expectRevert();
        _toggle(wallet, subId, false, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub could not be disabled");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _toggle(SmartWallet _wallet, uint256 _subId, bool _active, bool _isDirect) internal {
        _wallet.execute(
            address(cut), executeActionCalldata(toggleSubEncode(_subId, _active), _isDirect), 0
        );
    }

    /// @dev Toggles the default sub, expecting the matching SubStorage event and resulting state.
    function _toggleAndAssert(bool _active, bool _isDirect) internal {
        vm.expectEmit(true, true, true, true, address(subStorage));
        if (_active) emit SubStorage.ActivateSub(subId);
        else emit SubStorage.DeactivateSub(subId);

        _toggle(wallet, subId, _active, _isDirect);

        assertEq(subStorage.getSub(subId).isEnabled, _active);
    }

    /// @dev Puts the default sub into partial execution, toggles it and expects the partial execution
    ///      to be ended (event + storage cleared) together with the matching SubStorage event.
    function _toggleAndAssertPartialExecutionCleared(bool _active, bool _isDirect) internal {
        _startExecution(subId);
        _assertInPartialExecution(subId, walletAddr);

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        if (_active) emit SubStorage.ActivateSub(subId);
        else emit SubStorage.DeactivateSub(subId);

        _toggle(wallet, subId, _active, _isDirect);

        _assertNotInPartialExecution(subId);
        assertEq(subStorage.getSub(subId).isEnabled, _active);
    }

    function _assertInPartialExecution(uint256 _subId, address _wallet) internal view {
        assertTrue(
            partialExecutionStorage.isSubInPartialExecution(_subId),
            "sub must be in partial execution"
        );
        assertEq(
            partialExecutionStorage.getSubPartialExecutionWallet(_subId),
            _wallet,
            "wrong partial execution wallet"
        );
    }

    function _assertNotInPartialExecution(uint256 _subId) internal view {
        assertFalse(
            partialExecutionStorage.isSubInPartialExecution(_subId),
            "sub must not be in partial execution"
        );
        assertEq(
            partialExecutionStorage.getSubPartialExecutionWallet(_subId),
            address(0),
            "partial execution wallet must be cleared"
        );
    }
}
