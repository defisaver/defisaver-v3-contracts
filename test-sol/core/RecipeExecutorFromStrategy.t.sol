// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { SafeModuleAuth } from "../../contracts/core/strategy/SafeModuleAuth.sol";
import { BotAuth } from "../../contracts/core/strategy/BotAuth.sol";
import { SubStorage } from "../../contracts/core/strategy/SubStorage.sol";
import {
    StrategyPartialExecutionStorage,
    IStrategyPartialExecutionStorage
} from "../../contracts/core/strategy/StrategyPartialExecutionStorage.sol";
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
    /// @dev Mirrors RecipeExecutor.STRATEGY_PARTIAL_EXECUTION_FLAG.
    bytes32 internal constant STRATEGY_PARTIAL_EXECUTION_FLAG =
        keccak256("STRATEGY_PARTIAL_EXECUTION_FLAG");

    /// @dev The partialExecutions mapping is the only storage slot of StrategyPartialExecutionStorage, the wallet is
    ///      the first field of its struct value.
    uint256 internal constant PARTIAL_EXECUTIONS_SLOT = 0;

    uint256 internal constant PULL_AMOUNT = 1 ether;

    StrategyExecutor executor;
    StrategyPartialExecutionStorage partialExecutionStorage;
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
        partialExecutionStorage = new StrategyPartialExecutionStorage();
        trigger = new MockTrigger();
        secondTrigger = new MockTrigger();
        flActionAddr = address(new FLAction());

        vm.etch(MODULE_AUTH_ADDR, address(new SafeModuleAuth()).code);

        redeploy("RecipeExecutor", address(cut));
        redeploy("StrategyExecutorID", address(executor));
        redeploy("StrategyPartialExecutionStorage", address(partialExecutionStorage));
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
                       TESTS - ACTION CALL DATA VALIDATION
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The exact revert reasons are only visible on a direct call: routed through the wallet,
    ///      the Safe module swallows the inner revert data.
    function test_should_revert_when_action_call_data_length_is_invalid() public {
        (uint256 continuousSubId, StrategyModel.StrategySub memory continuousSub) =
            _subscribe(_strategy(true, 1, 1));
        (uint256 oneTimeSubId, StrategyModel.StrategySub memory oneTimeSub) =
            _subscribe(_strategy(false, 1, 1));

        // Fewer elements than the strategy has actions.
        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 0, 1)
        );
        cut.executeRecipeFromStrategy(
            continuousSubId, _actions(0), _triggerCallData(1), 0, continuousSub
        );

        // Continuous strategies never use the flag, so even a valid one is an extra element.
        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 2, 1)
        );
        cut.executeRecipeFromStrategy(
            continuousSubId, _withFlag(_actions(1)), _triggerCallData(1), 0, continuousSub
        );

        // For a one-time strategy one extra element is the flag, two is always invalid.
        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 3, 1)
        );
        cut.executeRecipeFromStrategy(
            oneTimeSubId, _withFlag(_withFlag(_actions(1))), _triggerCallData(1), 0, oneTimeSub
        );
    }

    function test_should_revert_when_flag_is_invalid() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(false, 1, 1));

        // Wrong 32 bytes.
        _expectInvalidFlag(subId, sub, abi.encode(keccak256("NOT_THE_FLAG")));

        // Starts with the right flag, but the extra element must be exactly 32 bytes.
        _expectInvalidFlag(
            subId, sub, abi.encode(STRATEGY_PARTIAL_EXECUTION_FLAG, STRATEGY_PARTIAL_EXECUTION_FLAG)
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                        TESTS - PARTIAL EXECUTION LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/
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

        vm.expectEmit(true, true, true, true, address(partialExecutionStorage));
        emit IStrategyPartialExecutionStorage.ExecutionStarted(subId, walletAddr);
        _execute(subId, 0, _withFlag(actionsCalldata), sub);

        assertEq(balanceOf(Addresses.WETH_ADDR, walletAddr), walletBalanceBefore, "FL paid back");
        assertEq(partialExecutionStorage.getSubPartialExecutionWallet(subId), walletAddr);
        assertTrue(subStorage.getSub(subId).isEnabled, "sub must stay enabled");
    }

    /*//////////////////////////////////////////////////////////////////////////
                             TESTS - TRIGGER SKIP GUARD
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev The triggers are skipped only when the sub is in partial execution for this wallet. For another
    ///      wallet they are evaluated, and the failing one is reported by its index.
    function test_should_check_triggers_when_execution_belongs_to_another_wallet() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) =
            _subscribe(_strategy(true, 1, 2), false, 2);

        // Set the partial execution wallet to a different address, so the triggers are checked.
        _forcePartialExecutionWallet(subId, alice);
        secondTrigger.setTriggered(false);

        vm.expectRevert(abi.encodeWithSelector(RecipeExecutor.TriggerNotActiveError.selector, 1));
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(2), 0, sub);
    }

    /// @dev Once the sub is in partial execution for this wallet the triggers are not checked at all, so a trigger
    ///      that has since turned false no longer blocks the bot. A real consequence of the skip: a changeable
    ///      trigger stops updating the stored sub data too.
    function test_should_skip_triggers_and_sub_data_update_while_in_partial_execution() public {
        trigger.setChangeable(true, abi.encode(uint256(42)));

        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(false, 1, 1));
        _fund(2);

        // First run: not in partial execution yet, the trigger is checked and writes the changed data.
        _execute(subId, 0, _withFlag(_actions(1)), sub);

        assertEq(
            partialExecutionStorage.getSubPartialExecutionWallet(subId),
            walletAddr,
            "must be in partial execution"
        );

        StrategyModel.StrategySub memory updatedSub = sub;
        updatedSub.triggerData[0] = abi.encode(uint256(42));

        bytes32 hashAfterFirstRun = subStorage.getSub(subId).strategySubHash;
        assertEq(
            hashAfterFirstRun,
            keccak256(abi.encode(updatedSub)),
            "first run must store the changed trigger data"
        );

        // Second run: the trigger would now fail and write different data, but it is not called at all.
        trigger.setTriggered(false);
        trigger.setChangeable(true, abi.encode(uint256(43)));
        uint256 callsBefore = trigger.callCount();

        // Passing the flag again must not start the execution a second time.
        vm.expectCall(
            address(partialExecutionStorage),
            abi.encodeWithSelector(StrategyPartialExecutionStorage.startExecution.selector),
            0
        );
        _execute(subId, 0, _withFlag(_actions(1)), updatedSub);

        assertEq(trigger.callCount(), callsBefore, "trigger must not be called at all");
        assertEq(
            subStorage.getSub(subId).strategySubHash,
            hashAfterFirstRun,
            "sub data must stay frozen while triggers are skipped"
        );
    }

    /// @dev RecipeExecutor reads the partial execution storage before anything else, so an unregistered id makes
    ///      every strategy execution revert.
    function test_should_revert_when_partial_execution_storage_is_not_registered() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribe(_strategy(true, 1, 1));

        redeploy("StrategyPartialExecutionStorage", address(0));

        // call to non-contract address 0x0000000000000000000000000000000000000000
        vm.expectRevert();
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(1), 0, sub);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - BUNDLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Validation must use the strategy resolved from the bundle, not the first one.
    function test_should_validate_call_data_against_the_resolved_bundle_strategy() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _subscribeToBundle();
        _fund(2);

        // Strategy at index 1 has two actions, so one element is too few.
        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 1, 2)
        );
        cut.executeRecipeFromStrategy(subId, _actions(1), _triggerCallData(1), 1, sub);

        // Strategies in this bundle are continuous, so the flag is rejected too.
        vm.expectRevert(
            abi.encodeWithSelector(RecipeExecutor.InvalidActionCallDataLength.selector, 3, 2)
        );
        cut.executeRecipeFromStrategy(subId, _withFlag(_actions(2)), _triggerCallData(1), 1, sub);

        // Call data matching the resolved strategy goes through.
        _execute(subId, 1, _actions(2), sub);
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

    function _expectInvalidFlag(
        uint256 _subId,
        StrategyModel.StrategySub memory _sub,
        bytes memory _flag
    ) internal {
        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = _actions(1)[0];
        actionsCalldata[1] = _flag;

        vm.expectRevert(
            abi.encodeWithSelector(
                RecipeExecutor.InvalidPartialExecutionFlag.selector,
                _flag,
                STRATEGY_PARTIAL_EXECUTION_FLAG
            )
        );
        cut.executeRecipeFromStrategy(_subId, actionsCalldata, _triggerCallData(1), 0, _sub);
    }

    /// @dev Writes partialExecutions[_subId].wallet directly. Only used for the defensive branch above,
    ///      which no legitimate sequence of calls can produce.
    function _forcePartialExecutionWallet(uint256 _subId, address _walletAddr) internal {
        vm.store(
            address(partialExecutionStorage),
            keccak256(abi.encode(_subId, PARTIAL_EXECUTIONS_SLOT)),
            bytes32(uint256(uint160(_walletAddr)))
        );
        assertEq(
            partialExecutionStorage.getSubPartialExecutionWallet(_subId),
            _walletAddr,
            "wrong partialExecutions storage slot"
        );
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

        withFlag[_actionsCalldata.length] = abi.encode(STRATEGY_PARTIAL_EXECUTION_FLAG);
    }
}
