// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { SafeModuleAuth } from "../../contracts/core/strategy/SafeModuleAuth.sol";
import { BotAuth } from "../../contracts/core/strategy/BotAuth.sol";
import { SubStorage } from "../../contracts/core/strategy/SubStorage.sol";
import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { CreateSub } from "../../contracts/actions/utils/CreateSub.sol";
import { PullToken } from "../../contracts/actions/utils/PullToken.sol";
import { SendToken } from "../../contracts/actions/utils/SendToken.sol";
import { FLAction } from "../../contracts/actions/flashloan/FLAction.sol";
import { ITrigger } from "../../contracts/interfaces/core/ITrigger.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { StrategyBuilder } from "../utils/StrategyBuilder.sol";
import { BundleBuilder } from "../utils/BundleBuilder.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { Vm } from "forge-std/Vm.sol";

/// @notice Trigger with settable results, so the trigger-skip paths can be driven deterministically.
contract MockTrigger is ITrigger {
    bool public triggered = true;
    bool public changeable;
    bytes public nextSubData;
    uint256 public callCount;

    function isTriggered(bytes memory, bytes memory) external override returns (bool) {
        callCount++;
        return triggered;
    }

    function isChangeable() external view override returns (bool) {
        return changeable;
    }

    function changedSubData(bytes memory) external view override returns (bytes memory) {
        return nextSubData;
    }

    function setTriggered(bool _triggered) external {
        triggered = _triggered;
    }

    function setChangeable(bool _changeable, bytes memory _nextSubData) external {
        changeable = _changeable;
        nextSubData = _nextSubData;
    }
}

contract TestCore_RecipeExecutorFromStrategy is ActionsUtils, RegistryUtils, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    RecipeExecutor cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Mirrors RecipeExecutor.SEMI_CONTINUOUS_FLAG.
    bytes32 internal constant SEMI_CONTINUOUS_FLAG = keccak256("SEMI_CONTINUOUS_FLAG");

    /// @dev executionWalletOf is the only storage slot of SemiContinuousTracker.
    uint256 internal constant EXECUTION_WALLET_SLOT = 0;

    uint256 internal constant PULL_AMOUNT = 1 ether;

    StrategyExecutor executor;
    SemiContinuousTracker tracker;
    SubStorage subStorage;
    MockTrigger trigger;
    MockTrigger secondTrigger;
    address flActionAddr;

    SmartWallet wallet;
    address walletAddr;
    address sender;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        subStorage = SubStorage(SUB_STORAGE_ADDR);

        cut = new RecipeExecutor();
        executor = new StrategyExecutor();
        tracker = new SemiContinuousTracker();
        trigger = new MockTrigger();
        secondTrigger = new MockTrigger();
        flActionAddr = address(new FLAction());

        vm.etch(MODULE_AUTH_ADDR, address(new SafeModuleAuth()).code);

        redeploy("RecipeExecutor", address(cut));
        redeploy("StrategyExecutorID", address(executor));
        redeploy("SemiContinuousTracker", address(tracker));
        redeploy("BotAuth", address(new BotAuth()));
        redeploy("CreateSub", address(new CreateSub()));
        redeploy("PullToken", address(new PullToken()));
        redeploy("SendToken", address(new SendToken()));
        redeploy("FLAction", flActionAddr);
        redeploy("MockTrigger", address(trigger));
        redeploy("MockTrigger2", address(secondTrigger));

        addBotCaller(address(this));
    }

    /*//////////////////////////////////////////////////////////////////////////
                       TESTS - ACTION CALL DATA LENGTH VALIDATION
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The exact revert reasons are only visible on a direct call: routed through the wallet,
    ///      the Safe module swallows the inner revert data.
    function test_should_revert_when_action_call_data_is_shorter_than_the_strategy() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 2, 1));

        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 1, 2)
        );
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(1), 0, sub);

        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay untouched");
        assertFalse(tracker.isInExecution(subId), "tracker must stay untouched");
    }

    function test_should_revert_when_action_call_data_is_empty() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));

        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 0, 1)
        );
        cut.executeRecipeFromStrategy(subId, _actions(0), _triggerCallData(1), 0, sub);
    }

    /// @dev One extra element is the flag, two is always invalid.
    function test_should_revert_when_action_call_data_is_two_elements_too_long() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));

        bytes[] memory actionsCalldata = _withFlag(_withFlag(_actions(1)));

        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 3, 1)
        );
        cut.executeRecipeFromStrategy(subId, actionsCalldata, _triggerCallData(1), 0, sub);
    }

    /*//////////////////////////////////////////////////////////////////////////
                            TESTS - FLAG VALIDATION
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev This is what the hardhat helper currently sends as the extra element.
    function test_should_revert_when_flag_is_empty_bytes() public {
        _expectInvalidFlag("");
    }

    function test_should_revert_when_flag_is_the_wrong_32_bytes() public {
        _expectInvalidFlag(abi.encode(keccak256("NOT_THE_FLAG")));
    }

    function test_should_revert_when_flag_is_longer_than_32_bytes() public {
        _expectInvalidFlag(abi.encode(SEMI_CONTINUOUS_FLAG, SEMI_CONTINUOUS_FLAG));
    }

    /*//////////////////////////////////////////////////////////////////////////
                          TESTS - SEMI-CONTINUOUS LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev startExecution early-returns on the second run, so the sub is marked once only.
    function test_should_not_start_execution_twice_when_flag_is_passed_again() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(false, 1, 1));
        _fund(2);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionStarted(subId, walletAddr);
        _execute(subId, 0, _withFlag(_actions(1)), sub);
        assertEq(tracker.executionWalletOf(subId), walletAddr);
        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay enabled");

        vm.recordLogs();
        _execute(subId, 0, _withFlag(_actions(1)), sub);

        assertEq(_countStartedEvents(), 0, "second run must not emit ExecutionStarted again");
        assertEq(tracker.executionWalletOf(subId), walletAddr);
        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay enabled");
    }

    /// @dev The extra flag element must not shift param mapping or return values: the recipe's
    ///      second action still consumes the first action's return value as $1. The FL test below
    ///      covers the same ground on a harder path, but is skipped on chains without Balancer.
    function test_should_not_corrupt_param_mapping_when_flag_is_appended() public {
        uint256 strategyId = _pullAndSendStrategy(false);
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(strategyId);
        _fund(1);

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = pullTokenEncode(Addresses.WETH_ADDR, sender, PULL_AMOUNT);
        actionsCalldata[1] = sendTokenEncode(Addresses.WETH_ADDR, charlie, 0);

        uint256 receiverBalanceBefore = balanceOf(Addresses.WETH_ADDR, charlie);

        _execute(subId, 0, _withFlag(actionsCalldata), sub);

        assertEq(
            balanceOf(Addresses.WETH_ADDR, charlie),
            receiverBalanceBefore + PULL_AMOUNT,
            "$1 mapping must still resolve to the pulled amount"
        );
        assertEq(tracker.executionWalletOf(subId), walletAddr);
    }

    /// @dev FL based strategy. The FL path (which re-encodes the recipe and runs the actions inside the FL callback)
    ///      must tolerate the extra element.
    function test_should_execute_fl_strategy_with_flag() public {
        vm.skip(!isFLBalancerSupportedOnSelectedNetwork());

        uint256 strategyId = _flStrategy();
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(strategyId);

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = flActionEncode(Addresses.WETH_ADDR, PULL_AMOUNT, FLSource.BALANCER);
        actionsCalldata[1] = sendTokenEncode(Addresses.WETH_ADDR, flActionAddr, 0);

        uint256 walletBalanceBefore = balanceOf(Addresses.WETH_ADDR, walletAddr);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionStarted(subId, walletAddr);
        _execute(subId, 0, _withFlag(actionsCalldata), sub);

        assertEq(balanceOf(Addresses.WETH_ADDR, walletAddr), walletBalanceBefore, "FL paid back");
        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay enabled");
    }

    /// @dev A continuous strategy validates the flag but never starts a semi-continuous execution,
    ///      it is already re-executable.
    function test_should_validate_flag_but_not_start_execution_for_continuous_strategy() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));
        _fund(1);

        // The tracker is not called
        vm.expectCall(
            address(tracker), abi.encodeCall(SemiContinuousTracker.startExecution, (subId)), 0
        );
        _execute(subId, 0, _withFlag(_actions(1)), sub);

        assertFalse(tracker.isInExecution(subId), "continuous strategy must not be tracked");
        assertTrue(subStorage.getSub(subId).isEnabled);
    }

    /*//////////////////////////////////////////////////////////////////////////
                             TESTS - TRIGGER SKIP GUARD
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The trigger is skipped only when the sub is in semi-continuous execution for this wallet.
    function test_should_check_triggers_when_execution_belongs_to_another_wallet() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));

        // Set the execution wallet to a different address, so the trigger is checked.
        _forceExecutionWallet(subId, alice);
        trigger.setTriggered(false);

        vm.expectRevert(abi.encodeWithSelector(RecipeExecutor.TriggerNotActiveError.selector, 0));
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(1), 0, sub);
    }

    /// @dev Once the sub is in execution for this wallet the trigger is not checked at all, so a
    ///      trigger that has since turned false no longer blocks the bot.
    function test_should_not_call_triggers_while_sub_is_in_execution() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(false, 1, 1));
        _fund(2);

        _execute(subId, 0, _withFlag(_actions(1)), sub);
        assertEq(tracker.executionWalletOf(subId), walletAddr, "must be in execution");

        trigger.setTriggered(false);
        uint256 callsBefore = trigger.callCount();

        _execute(subId, 0, _withFlag(_actions(1)), sub);

        assertEq(trigger.callCount(), callsBefore, "trigger must not be called at all");
    }

    /// @dev Not in execution: triggers are checked and the failing one is reported by index.
    function test_should_revert_with_the_failing_trigger_index() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) =
            _subscribe(_strategy(true, 1, 2), false, 2);

        secondTrigger.setTriggered(false);

        vm.expectRevert(abi.encodeWithSelector(RecipeExecutor.TriggerNotActiveError.selector, 1));
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(2), 0, sub);
    }

    /// @dev Documents a real consequence of the skip: a changeable trigger stops updating the
    ///      stored sub data once the sub is in semi-continuous execution.
    function test_should_stop_updating_changeable_trigger_data_while_in_execution() public {
        trigger.setChangeable(true, abi.encode(uint256(42)));

        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(false, 1, 1));
        _fund(2);

        _execute(subId, 0, _withFlag(_actions(1)), sub);

        StrategyModel.StrategySub memory updatedSub = sub;
        updatedSub.triggerData[0] = abi.encode(uint256(42));

        bytes32 hashAfterFirstRun = subStorage.getSub(subId).strategySubHash;
        assertEq(
            hashAfterFirstRun,
            keccak256(abi.encode(updatedSub)),
            "first run must store the changed trigger data"
        );

        /// @dev Would be written on the next trigger check, if there was one.
        trigger.setChangeable(true, abi.encode(uint256(43)));

        _execute(subId, 0, _withFlag(_actions(1)), updatedSub);

        assertEq(
            subStorage.getSub(subId).strategySubHash,
            hashAfterFirstRun,
            "sub data must stay frozen while triggers are skipped"
        );
    }

    /// @dev RecipeExecutor reads the tracker before anything else, so an unregistered id makes
    ///      every strategy execution revert.
    function test_should_revert_when_tracker_is_not_registered() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));

        redeploy("SemiContinuousTracker", address(0));

        // call to non-contract address 0x0000000000000000000000000000000000000000
        vm.expectRevert();
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(1), 0, sub);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - BUNDLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Validation must use the resolved strategy from the bundle, not the first one.
    function test_should_validate_call_data_against_the_resolved_bundle_strategy() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribeToBundle();
        _fund(2);

        /// @dev Strategy at index 1 has two actions, so one element is too few.
        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 1, 2)
        );
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(1), 1, sub);

        _execute(subId, 1, _actions(2), sub);
    }

    /// @dev The flag is validated against the resolved strategy's action count as well.
    function test_should_accept_flag_on_the_resolved_bundle_strategy() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribeToBundle();
        _fund(2);

        _execute(subId, 1, _withFlag(_actions(2)), sub);

        assertFalse(tracker.isInExecution(subId), "bundle strategies here are continuous");
        assertTrue(subStorage.getSub(subId).isEnabled);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _execute(
        uint256 _subId,
        uint256 _strategyIndex,
        bytes[] memory _actionsCalldata,
        StrategyModel.StrategySub memory _sub
    ) internal {
        executor.executeStrategy(
            _subId,
            _strategyIndex,
            _triggerCallData(_sub.triggerData.length),
            _actionsCalldata,
            _sub
        );
    }

    function _expectInvalidFlag(bytes memory _flag) internal {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = _actions(1)[0];
        actionsCalldata[1] = _flag;

        vm.expectRevert(
            abi.encodeWithSelector(
                RecipeExecutor.InvalidSemiContinuousFlag.selector, _flag, SEMI_CONTINUOUS_FLAG
            )
        );
        cut.executeRecipeFromStrategy(subId, actionsCalldata, _triggerCallData(1), 0, sub);
    }

    /// @dev Writes executionWalletOf[_subId] directly. Only used for the defensive branch above,
    ///      which no legitimate sequence of calls can produce.
    function _forceExecutionWallet(uint256 _subId, address _walletAddr) internal {
        vm.store(
            address(tracker),
            keccak256(abi.encode(_subId, EXECUTION_WALLET_SLOT)),
            bytes32(uint256(uint160(_walletAddr)))
        );
        assertEq(tracker.executionWalletOf(_subId), _walletAddr, "wrong tracker storage slot");
    }

    function _countStartedEvents() internal view returns (uint256 count) {
        Vm.Log[] memory logs = vm.getRecordedLogs();

        for (uint256 i = 0; i < logs.length; ++i) {
            if (logs[i].emitter != address(tracker)) continue;
            if (logs[i].topics[0] != SemiContinuousTracker.ExecutionStarted.selector) continue;

            count++;
        }
    }

    /// @dev Strategy of _numActions PullToken actions and _numTriggers mock triggers. No param
    ///      mapping, the bot sends the full call data.
    function _strategy(bool _continuous, uint256 _numActions, uint256 _numTriggers)
        internal
        returns (uint256)
    {
        StrategyBuilder strategy = new StrategyBuilder("mockStrategy", _continuous);

        for (uint256 i = 0; i < _numActions; ++i) {
            strategy.addAction("PullToken", new string[](3));
        }

        strategy.addTrigger("MockTrigger");
        if (_numTriggers > 1) strategy.addTrigger("MockTrigger2");

        return strategy.createStrategy();
    }

    /// @dev PullToken followed by SendToken, whose amount is mapped from the pull's return value.
    function _pullAndSendStrategy(bool _continuous) internal returns (uint256) {
        StrategyBuilder strategy = new StrategyBuilder("pullAndSend", _continuous);
        strategy.addAction("PullToken", new string[](3));

        string[] memory sendParams = new string[](3);
        sendParams[2] = "$1";
        strategy.addAction("SendToken", sendParams);

        strategy.addTrigger("MockTrigger");

        return strategy.createStrategy();
    }

    /// @dev Flash loan as the first action, paid back by the second one.
    function _flStrategy() internal returns (uint256) {
        StrategyBuilder strategy = new StrategyBuilder("flStrategy", false);
        strategy.addAction("FLAction", new string[](1));

        string[] memory sendParams = new string[](3);
        sendParams[2] = "$1";
        strategy.addAction("SendToken", sendParams);

        strategy.addTrigger("MockTrigger");

        return strategy.createStrategy();
    }

    function _subscribeToBundle()
        internal
        returns (uint256 subId, StrategyModel.StrategySub memory sub)
    {
        uint64[] memory strategyIds = new uint64[](2);
        strategyIds[0] = uint64(_strategy(true, 1, 1));
        strategyIds[1] = uint64(_strategy(true, 2, 1));

        return _subscribe(new BundleBuilder().init(strategyIds), true, 1);
    }

    function _subscribe(uint256 _strategyId)
        internal
        returns (uint256 subId, StrategyModel.StrategySub memory sub)
    {
        return _subscribe(_strategyId, false, 1);
    }

    function _subscribe(uint256 _strategyOrBundleId, bool _isBundle, uint256 _numTriggers)
        internal
        returns (uint256 subId, StrategyModel.StrategySub memory sub)
    {
        bytes[] memory triggerData = _triggerCallData(_numTriggers);

        sub = StrategyModel.StrategySub({
            strategyOrBundleId: uint64(_strategyOrBundleId),
            isBundle: _isBundle,
            triggerData: triggerData,
            subData: new bytes32[](0)
        });

        subId = subStorage.getSubsCount();

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = createSubEncode(sub);
        bytes4[] memory ids = new bytes4[](1);
        ids[0] = bytes4(keccak256("CreateSub"));
        uint8[][] memory paramMapping = new uint8[][](1);
        paramMapping[0] = new uint8[](0);

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "CreateSubRecipe",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: ids,
            paramMapping: paramMapping
        });

        wallet.execute(
            address(cut), abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe), 0
        );
    }

    function _fund(uint256 _executions) internal {
        give(Addresses.WETH_ADDR, sender, PULL_AMOUNT * _executions);
        approveAsSender(sender, Addresses.WETH_ADDR, walletAddr, PULL_AMOUNT * _executions);
    }

    function _actions(uint256 _numActions) internal view returns (bytes[] memory actionsCalldata) {
        actionsCalldata = new bytes[](_numActions);

        for (uint256 i = 0; i < _numActions; ++i) {
            actionsCalldata[i] = pullTokenEncode(Addresses.WETH_ADDR, sender, PULL_AMOUNT);
        }
    }

    function _triggerCallData(uint256 _numTriggers)
        internal
        pure
        returns (bytes[] memory triggerCalldata)
    {
        triggerCalldata = new bytes[](_numTriggers);

        for (uint256 i = 0; i < _numTriggers; ++i) {
            triggerCalldata[i] = abi.encode(uint256(1));
        }
    }

    function _withFlag(bytes[] memory _actionsCalldata)
        internal
        pure
        returns (bytes[] memory withFlag)
    {
        withFlag = new bytes[](_actionsCalldata.length + 1);

        for (uint256 i = 0; i < _actionsCalldata.length; ++i) {
            withFlag[i] = _actionsCalldata[i];
        }

        withFlag[_actionsCalldata.length] = abi.encode(SEMI_CONTINUOUS_FLAG);
    }
}
