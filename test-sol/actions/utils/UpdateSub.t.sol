// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { UpdateSub } from "../../../contracts/actions/utils/UpdateSub.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { SubStorage } from "../../../contracts/core/strategy/SubStorage.sol";
import {
    IStrategyPartialExecutionStorage
} from "../../../contracts/core/strategy/StrategyPartialExecutionStorage.sol";

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
                                  TESTS - UPDATING
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev updateSubData writes strategySubHash only, isEnabled and the owner must stay the same.
    function test_should_update_sub_data() public {
        // Through executeAction (delegatecall from the wallet).
        _updateAndAssert(_bundleSub(123), false);

        // Through executeActionDirect.
        _updateAndAssert(_bundleSub(456), true);

        // UpdateSub never looks at isEnabled, so a disabled sub can still be updated and stays disabled:
        // the user can re-tune a paused sub before enabling it again.
        prank(walletAddr);
        subStorage.deactivateSub(subId);
        _updateAndAssert(_bundleSub(789), false);
        assertFalse(subStorage.getSub(subId).isEnabled, "sub must stay disabled");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - VALIDATION
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The wallet swallows the revert data, so the exact errors are checked in the test below.
    function test_should_revert_when_updating_sub_of_another_owner() public {
        SmartWallet otherWallet = new SmartWallet(alice);
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        // SubStorage::SenderNotSubOwnerError
        vm.expectRevert();
        _update(otherWallet, subId, _bundleSub(1), false);

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore, "sub must stay untouched");
    }

    /// @dev The action holds no auth of its own, it relies on being delegatecalled by the owner
    ///      wallet. Called directly, msg.sender stays the action itself, so it is rejected. No wallet
    ///      swallows the revert data here, so the exact errors can be matched.
    function test_should_revert_with_exact_errors_when_called_without_a_wallet() public {
        vm.expectRevert(
            abi.encodeWithSelector(SubStorage.SenderNotSubOwnerError.selector, address(cut), subId)
        );
        cut.executeActionDirect(updateSubEncode(subId, _bundleSub(1)));

        // When the sub is in partial execution the partial execution storage rejects the call
        // before SubStorage does.
        _startExecution(subId);

        vm.expectRevert(
            abi.encodeWithSelector(
                IStrategyPartialExecutionStorage.NotAuthorized.selector, subId, address(cut)
            )
        );
        cut.executeActionDirect(updateSubEncode(subId, _bundleSub(1)));
    }

    function test_should_revert_for_out_of_range_strategy_id() public {
        StrategyModel.StrategySub memory newSub = _bundleSub(1);

        // The action must own the sub to get past the owner check.
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

    /// @dev onlySubOwner indexes strategiesSubs before comparing the owner, so an id past the end
    ///      of the array panics with an out-of-bounds access instead of SenderNotSubOwnerError.
    function test_should_panic_on_non_existent_sub() public {
        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert(stdError.indexOOBError);
        cut.executeActionDirect(updateSubEncode(nonExistentSubId, _bundleSub(1)));
    }

    /*//////////////////////////////////////////////////////////////////////////
                       TESTS - PARTIAL EXECUTION INTERACTION
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_clear_partial_execution_on_update() public {
        _updateAndAssertPartialExecutionCleared(_bundleSub(1), false);
        _updateAndAssertPartialExecutionCleared(_bundleSub(2), true);
    }

    /// @dev endExecution is keyed by subId, so updating one sub must end only that sub's partial execution,
    ///      leaving both the same owner's other sub and another owner's sub untouched.
    function test_should_end_execution_only_for_the_updated_sub() public {
        uint256 secondSubId = _subscribe(wallet);

        SmartWallet otherWallet = new SmartWallet(alice);
        address otherWalletAddr = otherWallet.walletAddr();
        uint256 otherSubId = _subscribe(otherWallet);

        _startExecution(subId);
        _startExecution(secondSubId);
        _startExecution(otherSubId);

        bytes32 secondHashBefore = subStorage.getSub(secondSubId).strategySubHash;
        bytes32 otherHashBefore = subStorage.getSub(otherSubId).strategySubHash;
        StrategyModel.StrategySub memory newSub = _bundleSub(123);

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(newSub)), newSub);
        _update(wallet, subId, newSub, false);

        _assertNotInPartialExecution(subId);
        assertEq(subStorage.getSub(subId).strategySubHash, keccak256(abi.encode(newSub)));

        _assertInPartialExecution(secondSubId, walletAddr);
        assertEq(
            subStorage.getSub(secondSubId).strategySubHash,
            secondHashBefore,
            "other sub's data must stay untouched"
        );

        _assertInPartialExecution(otherSubId, otherWalletAddr);
        assertEq(
            subStorage.getSub(otherSubId).strategySubHash,
            otherHashBefore,
            "other owner's sub must stay untouched"
        );
    }

    /// @dev Updating a sub that was never in partial execution hits endExecution's early return
    ///      and must not reach into the other sub's entry.
    function test_should_not_touch_other_subs_partial_execution_when_updating_an_idle_sub() public {
        uint256 secondSubId = _subscribe(wallet);
        _startExecution(secondSubId);
        _assertNotInPartialExecution(subId);

        bytes32 secondHashBefore = subStorage.getSub(secondSubId).strategySubHash;

        _updateAndAssert(_bundleSub(123), false);

        _assertNotInPartialExecution(subId);
        _assertInPartialExecution(secondSubId, walletAddr);
        assertEq(
            subStorage.getSub(secondSubId).strategySubHash,
            secondHashBefore,
            "other sub's data must stay untouched"
        );
    }

    /// @dev The partial execution storage is a hard dependency of every update, not just for subs in partial execution.
    ///      Reverts with no error data: the call to address(0) fails the extcodesize check.
    function test_should_revert_when_partial_execution_storage_is_not_registered() public {
        redeploy("StrategyPartialExecutionStorage", address(0));
        bytes32 hashBefore = subStorage.getSub(subId).strategySubHash;

        // call to non-contract address 0x0000000000000000000000000000000000000000
        vm.expectRevert();
        _update(wallet, subId, _bundleSub(1), false);

        assertEq(subStorage.getSub(subId).strategySubHash, hashBefore, "sub could not be updated");
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

    /// @dev Updates the default sub, expecting the UpdateData event and the new hash, with isEnabled
    ///      and the owner left as they were.
    function _updateAndAssert(StrategyModel.StrategySub memory _newSub, bool _isDirect) internal {
        bool isEnabledBefore = subStorage.getSub(subId).isEnabled;
        address ownerBefore = address(subStorage.getSub(subId).walletAddr);

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(_newSub)), _newSub);
        _update(wallet, subId, _newSub, _isDirect);

        assertEq(
            subStorage.getSub(subId).strategySubHash,
            keccak256(abi.encode(_newSub)),
            "hash must match the new sub"
        );
        assertEq(
            subStorage.getSub(subId).isEnabled, isEnabledBefore, "update must not touch isEnabled"
        );
        assertEq(address(subStorage.getSub(subId).walletAddr), ownerBefore, "owner must not change");
    }

    /// @dev Puts the default sub into partial execution, updates it and expects the partial execution
    ///      to be ended (event + storage cleared) together with the UpdateData event.
    function _updateAndAssertPartialExecutionCleared(
        StrategyModel.StrategySub memory _newSub,
        bool _isDirect
    ) internal {
        _startExecution(subId);
        _assertInPartialExecution(subId, walletAddr);

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionEnded(subId, walletAddr, walletAddr);
        vm.expectEmit(true, true, true, true, address(subStorage));
        emit SubStorage.UpdateData(subId, keccak256(abi.encode(_newSub)), _newSub);
        _update(wallet, subId, _newSub, _isDirect);

        _assertNotInPartialExecution(subId);
        assertEq(subStorage.getSub(subId).strategySubHash, keccak256(abi.encode(_newSub)));
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
