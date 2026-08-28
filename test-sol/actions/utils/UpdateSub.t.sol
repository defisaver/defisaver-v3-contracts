// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { UpdateSub } from "../../../contracts/actions/utils/UpdateSub.sol";
import { ActionBase } from "../../../contracts/actions/ActionBase.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { IDSProxy } from "../../../contracts/interfaces/DS/IDSProxy.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import { SemiContinuousTracker } from "../../../contracts/core/strategy/SemiContinuousTracker.sol";

import { SubActionsBase } from "../../utils/SubActionsBase.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { stdError } from "forge-std/StdError.sol";

contract TestUpdateSub is SubActionsBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    UpdateSub cut;

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

        cut = new UpdateSub();
        _setUpSubActions();

        subId = _subscribe(wallet);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                TESTS - BASIC UPDATE
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_update_sub_data() public {
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        StrategyModel.StrategySub memory newSub = _bundleSub(123);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, false);

        bytes32 hashAfter = subStorage.getSub(subId).strategySubHash;
        assertTrue(hashAfter != hashBefore, "hash must change");
        assertEq(hashAfter, keccak256(abi.encode(newSub)), "hash must match the new sub");
    }

    function test_should_update_sub_data_direct() public {
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        StrategyModel.StrategySub memory newSub = _bundleSub(456);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, true);

        bytes32 hashAfter = subStorage.getSub(subId).strategySubHash;
        assertTrue(hashAfter != hashBefore, "hash must change");
        assertEq(hashAfter, keccak256(abi.encode(newSub)), "hash must match the new sub");
    }

    /// @dev The write and the event still happen, only the stored hash comes out the same.
    function test_should_leave_hash_unchanged_when_updating_with_identical_data() public {
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        StrategyModel.StrategySub memory sameSub = _bundleSub(INITIAL_SEED);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(sameSub)), sameSub);
        _update(wallet, subId, sameSub, false);

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore);
    }

    /// @dev updateSubData writes strategySubHash only, the other two fields must stay the same.
    function test_should_only_change_the_sub_hash() public {
        assertTrue(subStorage.getSub(subId).isEnabled);

        StrategyModel.StrategySub memory newSub = _bundleSub(2);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, false);

        assertTrue(subStorage.getSub(subId).isEnabled, "update must not touch isEnabled");
        assertEq(address(subStorage.getSub(subId).walletAddr), walletAddr, "owner must not change");
    }

    /// @dev UpdateSub never looks at isEnabled, so a disabled sub can still be updated and stays
    ///      disabled: the user can re-tune a paused sub before enabling it again.
    function test_should_update_disabled_sub() public {
        prank(walletAddr);
        subStorage.deactivateSub(subId);
        assertFalse(subStorage.getSub(subId).isEnabled);

        StrategyModel.StrategySub memory newSub = _bundleSub(321);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, false);

        assertEq(
            subStorage.getSub(subId).strategySubHash,
            keccak256(abi.encode(newSub)),
            "hash must match the new sub"
        );
        assertFalse(subStorage.getSub(subId).isEnabled, "sub must stay disabled");
    }

    function test_action_type_should_be_standard_action() public view {
        assertEq(cut.actionType(), uint8(ActionBase.ActionType.STANDARD_ACTION));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - VALIDATION
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_revert_when_updating_sub_of_another_owner() public {
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        vm.expectRevert(
            abi.encodeWithSelector(SubStorage.SenderNotSubOwnerError.selector, address(cut), subId)
        );
        cut.executeActionDirect(updateSubEncode(subId, _bundleSub(1)));

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore, "sub must stay untouched");
    }

    /// @dev Same as above but routed through a wallet, which swallows the exact error.
    function test_should_revert_when_updating_sub_of_another_owner_from_their_wallet() public {
        SmartWallet otherWallet = new SmartWallet(alice);
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        // SubStorage::SenderNotSubOwnerError
        vm.expectRevert();
        _update(otherWallet, subId, _bundleSub(1), false);

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore, "sub must stay untouched");
    }

    /// @dev When the sub is in execution the tracker's NotAuthorized check fires first, masking
    ///      SubStorage's SenderNotSubOwnerError. Same outcome, but the revert reason is different.
    function test_should_revert_when_updating_in_execution_sub_of_another_owner() public {
        _startExecution(subId);

        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        vm.expectRevert(
            abi.encodeWithSelector(
                SemiContinuousTracker.NotAuthorized.selector, subId, address(cut)
            )
        );
        cut.executeActionDirect(updateSubEncode(subId, _bundleSub(1)));

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore, "sub must stay untouched");
        assertTrue(tracker.isInExecution(subId), "tracker must stay untouched");
    }

    function test_should_revert_for_out_of_range_strategy_id() public {
        StrategyModel.StrategySub memory newSub = _bundleSub(1);
        newSub.strategyOrBundleId = type(uint64).max;

        // SubStorage::SubIdOutOfRange
        vm.expectRevert();
        _update(wallet, subId, newSub, false);
    }

    /// @dev Same call without a wallet in the way, so the exact error can be matched
    function test_should_revert_with_sub_id_out_of_range_when_called_without_a_wallet() public {
        StrategyModel.StrategySub memory newSub = _bundleSub(1);

        prank(address(cut));
        uint256 cutSubId = subStorage.subscribeToStrategy(newSub);

        newSub.strategyOrBundleId = type(uint64).max;

        vm.expectRevert(
            abi.encodeWithSelector(
                SubStorage.SubIdOutOfRange.selector, uint256(type(uint64).max), true
            )
        );
        cut.executeActionDirect(updateSubEncode(cutSubId, newSub));
    }

    function test_should_revert_for_out_of_range_sub_id() public {
        uint256 nonExistentSubId = subStorage.getSubsCount() + 1000;

        // panic: array out-of-bounds access (0x32)
        vm.expectRevert();
        _update(wallet, nonExistentSubId, _bundleSub(1), false);
    }

    function test_should_revert_for_out_of_range_sub_id_when_called_without_a_wallet() public {
        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert(stdError.indexOOBError);
        cut.executeActionDirect(updateSubEncode(nonExistentSubId, _bundleSub(1)));
    }

    /*//////////////////////////////////////////////////////////////////////////
                          TESTS - SEMI-CONTINUOUS INTERACTION
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_clear_semi_continuous_execution_on_update() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));
        assertEq(tracker.executionWalletOf(subId), walletAddr);

        StrategyModel.StrategySub memory newSub = _bundleSub(1);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(subId, walletAddr, walletAddr);
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, false);

        assertFalse(tracker.isInExecution(subId), "update must clear the tracker");
        assertEq(tracker.executionWalletOf(subId), address(0));
    }

    function test_should_clear_semi_continuous_execution_on_update_direct() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));
        assertEq(tracker.executionWalletOf(subId), walletAddr);

        StrategyModel.StrategySub memory newSub = _bundleSub(1);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(subId, walletAddr, walletAddr);
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, true);

        assertFalse(tracker.isInExecution(subId), "update must clear the tracker");
        assertEq(tracker.executionWalletOf(subId), address(0));
    }

    /// @dev Updating again in the same state hits the finishExecution early-return, the first
    ///      update already cleared the tracker.
    function test_should_update_again_after_semi_continuous_execution_was_cleared() public {
        _startExecution(subId);
        assertTrue(tracker.isInExecution(subId));
        assertEq(tracker.executionWalletOf(subId), walletAddr);

        StrategyModel.StrategySub memory firstSub = _bundleSub(1);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(subId, walletAddr, walletAddr);
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(firstSub)), firstSub);
        _update(wallet, subId, firstSub, false);

        assertFalse(tracker.isInExecution(subId), "update must clear the tracker");
        assertEq(subStorage.getSub(subId).strategySubHash, keccak256(abi.encode(firstSub)));
        assertEq(tracker.executionWalletOf(subId), address(0));

        StrategyModel.StrategySub memory secondSub = _bundleSub(2);

        /// @dev No ExecutionFinished this time, finishExecution early-returns.
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(secondSub)), secondSub);
        _update(wallet, subId, secondSub, false);

        assertFalse(tracker.isInExecution(subId), "tracker must stay cleared");
        assertEq(subStorage.getSub(subId).strategySubHash, keccak256(abi.encode(secondSub)));
        assertEq(tracker.executionWalletOf(subId), address(0));
    }

    /// @dev The tracker is a hard dependency of every update, not just semi-continuous ones.
    ///      Reverts with no error data: the call to address(0) fails the extcodesize check.
    function test_should_revert_on_update_when_tracker_is_not_registered() public {
        redeploy("SemiContinuousTracker", address(0));
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        // call to non-contract address 0x0000000000000000000000000000000000000000
        vm.expectRevert();
        _update(wallet, subId, _bundleSub(1), false);

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore, "sub could not be updated");
        assertEq(tracker.executionWalletOf(subId), address(0));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                TESTS - RETURN VALUE
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_sub_id() public {
        SmartWallet dsProxyWallet = new SmartWallet(charlie);
        address dsProxyAddr = dsProxyWallet.createDSProxy();

        uint256 dsSubId = _subscribe(dsProxyWallet);
        StrategyModel.StrategySub memory dsSub = _bundleSub(55);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(dsSubId, keccak256(abi.encode(dsSub)), dsSub);

        prank(dsProxyWallet.owner());
        bytes32 response = IDSProxy(dsProxyAddr)
            .execute(address(cut), executeActionCalldata(updateSubEncode(dsSubId, dsSub), false));

        assertEq(uint256(response), dsSubId, "executeAction must return the subId");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _update(
        SmartWallet _wallet,
        uint256 _subId,
        StrategyModel.StrategySub memory _sub,
        bool _isDirect
    ) internal {
        _wallet.execute(
            address(cut), executeActionCalldata(updateSubEncode(_subId, _sub), _isDirect), 0
        );
    }
}
