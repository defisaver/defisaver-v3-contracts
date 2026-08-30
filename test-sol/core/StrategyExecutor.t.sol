// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SafeModuleAuth } from "../../contracts/core/strategy/SafeModuleAuth.sol";
import { StrategyExecutorCommon } from "../../contracts/core/strategy/StrategyExecutorCommon.sol";
import { ProxyAuth } from "../../contracts/core/strategy/ProxyAuth.sol";
import { BotAuth } from "../../contracts/core/strategy/BotAuth.sol";
import { StrategyExecutor } from "../../contracts/core/strategy/StrategyExecutor.sol";
import { RecipeExecutor } from "../../contracts/core/RecipeExecutor.sol";
import { SubStorage } from "../../contracts/core/strategy/SubStorage.sol";
import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { CreateSub } from "../../contracts/actions/utils/CreateSub.sol";
import { ToggleSub } from "../../contracts/actions/utils/ToggleSub.sol";
import { GasPriceTrigger } from "../../contracts/triggers/GasPriceTrigger.sol";
import { PullToken } from "../../contracts/actions/utils/PullToken.sol";
import { ActionBase } from "../../contracts/actions/ActionBase.sol";
import { ISemiContinuousTracker } from "../../contracts/interfaces/core/ISemiContinuousTracker.sol";
import { DFSIds } from "../../contracts/utils/DFSIds.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { StrategyBuilder } from "../utils/StrategyBuilder.sol";
import { BundleBuilder } from "../utils/BundleBuilder.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";
import { stdError } from "forge-std/StdError.sol";

/// @notice Test-only action that calls SemiContinuousTracker.startExecution from inside a recipe,
///         i.e. from the user's wallet, to probe what the executor's transient approval allows.
///         The subId it starts is taken from the action's call data, so the bot picks it.
contract StartExecutionAction is ActionBase {
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {
        uint256 subId = abi.decode(_callData, (uint256));

        ISemiContinuousTracker(registry.getAddr(DFSIds.SEMI_CONTINUOUS_TRACKER))
            .startExecution(subId);

        return bytes32(subId);
    }

    function executeActionDirect(bytes memory) public payable override { }

    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }
}

contract TestCore_StrategyExecutor is ActionsUtils, RegistryUtils, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    StrategyExecutor cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Mirrors RecipeExecutor.SEMI_CONTINUOUS_FLAG, the marker the bot appends to
    ///      _actionsCallData to keep a one-time sub alive after execution.
    bytes32 internal constant SEMI_CONTINUOUS_FLAG = keccak256("SEMI_CONTINUOUS_FLAG");

    SmartWallet wallet;
    address walletAddr;
    address sender;

    address botAuthAddr;
    address recipeExecutorAddr;

    SubStorage subStorage;
    SemiContinuousTracker tracker;

    struct DummySubData {
        address token;
        uint256 amount;
        uint256 maxGasPrice;
    }

    /// @dev A subscribed strategy plus everything needed to execute it.
    struct Fixture {
        uint256 subId;
        StrategyModel.StrategySub sub;
        DummySubData subData;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        cut = new StrategyExecutor();
        subStorage = SubStorage(SUB_STORAGE_ADDR);

        vm.etch(MODULE_AUTH_ADDR, address(new SafeModuleAuth()).code);
        vm.etch(PROXY_AUTH_ADDR, address(new ProxyAuth()).code);

        botAuthAddr = address(new BotAuth());
        tracker = new SemiContinuousTracker();

        redeploy("StrategyExecutorID", address(cut));
        redeploy("PullToken", address(new PullToken()));
        redeploy("GasPriceTrigger", address(new GasPriceTrigger()));
        recipeExecutorAddr = address(new RecipeExecutor());
        redeploy("RecipeExecutor", recipeExecutorAddr);
        redeploy("CreateSub", address(new CreateSub()));
        redeploy("ToggleSub", address(new ToggleSub()));
        redeploy("BotAuth", botAuthAddr);
        redeploy("SemiContinuousTracker", address(tracker));
        redeploy("StartExecutionAction", address(new StartExecutionAction()));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - BOT AUTH
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_call_execute_when_sender_is_not_authorized_bot() public {
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutorCommon.BotNotApproved.selector, address(this), 0)
        );
        StrategyModel.StrategySub memory dummySub;
        cut.executeStrategy(0, 0, new bytes[](0), new bytes[](0), dummySub);
    }

    /// @dev BotAuth is read live on every call, so revoking a bot stops it immediately.
    function test_should_fail_to_call_execute_when_bot_caller_was_removed() public {
        Fixture memory f = _fixture(true, type(uint256).max);

        prank(Addresses.OWNER_ACC);
        BotAuth(botAuthAddr).removeCaller(address(this));

        vm.expectRevert(
            abi.encodeWithSelector(
                StrategyExecutorCommon.BotNotApproved.selector, address(this), f.subId
            )
        );
        _execute(f);
    }

    /// @dev Auth is checked before the sub is read, so a bogus subId still reports BotNotApproved
    ///      instead of panicking on the SubStorage array access.
    function test_should_check_bot_auth_before_reading_the_sub() public {
        uint256 nonExistentSubId = subStorage.getSubsCount() + 100;

        vm.expectRevert(
            abi.encodeWithSelector(
                StrategyExecutorCommon.BotNotApproved.selector, address(this), nonExistentSubId
            )
        );
        StrategyModel.StrategySub memory dummySub;
        cut.executeStrategy(nonExistentSubId, 0, new bytes[](0), new bytes[](0), dummySub);
    }

    /*//////////////////////////////////////////////////////////////////////////
                               TESTS - SUB VALIDATION
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_call_execute_when_sub_data_hash_mismatch() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(
            DummySubData({ token: Addresses.WETH_ADDR, amount: 1, maxGasPrice: type(uint256).max })
        );

        bytes32 storedSubHash = keccak256(abi.encode(sub));
        sub.strategyOrBundleId = 1;
        bytes32 changedSubHash = keccak256(abi.encode(sub));

        _add_bot_caller();

        vm.expectRevert(
            abi.encodeWithSelector(
                StrategyExecutor.SubDatHashMismatch.selector, subId, changedSubHash, storedSubHash
            )
        );
        cut.executeStrategy(subId, 0, new bytes[](0), new bytes[](0), sub);
    }

    function test_should_fail_to_call_execute_when_sub_is_not_enabled() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(
            DummySubData({ token: Addresses.WETH_ADDR, amount: 1, maxGasPrice: type(uint256).max })
        );

        _disable_sub(subId, sub);

        _add_bot_caller();

        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutorCommon.SubNotEnabled.selector, subId)
        );
        cut.executeStrategy(subId, 0, new bytes[](0), new bytes[](0), sub);
    }

    /// @dev getSub indexes the subs array, so an id past the end panics before any validation.
    function test_should_panic_for_non_existent_sub_id() public {
        _add_bot_caller();

        uint256 nonExistentSubId = subStorage.getSubsCount();

        vm.expectRevert(stdError.indexOOBError);
        StrategyModel.StrategySub memory dummySub;
        cut.executeStrategy(nonExistentSubId, 0, new bytes[](0), new bytes[](0), dummySub);
    }

    /*//////////////////////////////////////////////////////////////////////////
                            TESTS - HAPPY PATH / WALLET TYPES
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_call_strategy_for_safe_wallet() public {
        _callStrategyBaseTest();
    }

    function test_should_call_strategy_for_ds_proxy_wallet() public {
        wallet = new SmartWallet(alice);
        walletAddr = wallet.createDSProxy();
        sender = wallet.owner();

        _callStrategyBaseTest();
    }

    /// @dev _callActions forwards msg.value to the auth contract, but executeStrategy is not
    ///      payable, so that value is always zero and a bot cannot fund the recipe this way.
    function test_should_reject_value_sent_with_execute_strategy() public {
        Fixture memory f = _fixture(true, type(uint256).max);

        vm.deal(address(this), 1 ether);

        (bool success,) = address(cut).call{ value: 1 }(
            abi.encodeWithSelector(
                StrategyExecutor.executeStrategy.selector,
                f.subId,
                uint256(0),
                _triggers(f.subData),
                _actions(f.subData, 1),
                f.sub
            )
        );

        assertFalse(success, "executeStrategy must not be payable");

        /// @dev Same call without value goes through, so the failure above is the payability.
        _execute(f);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - TRIGGERS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_execute_strategy_for_inactive_triggers() public {
        DummySubData memory subData =
            DummySubData({ token: Addresses.WETH_ADDR, amount: 1, maxGasPrice: 0 });

        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(subData);

        _add_bot_caller();

        give(subData.token, sender, subData.amount);
        approveAsSender(sender, subData.token, walletAddr, subData.amount);

        ///@dev Set higher gas price than maxGasPrice. This will make the trigger inactive.
        vm.txGasPrice(1);

        /// @dev Inner revert which we can't catch. Generic revert will be bubbled up.
        //vm.expectRevert(abi.encodeWithSelector(RecipeExecutor.TriggerNotActiveError.selector, 0));
        vm.expectRevert();
        cut.executeStrategy(subId, 0, _triggers(subData), _actions(subData, 1), sub);
    }

    /// @dev Once the sub is in semi-continuous execution for this wallet, RecipeExecutor skips the
    ///      trigger check entirely, so a trigger that would now be false no longer blocks the bot.
    function test_should_skip_triggers_while_sub_is_in_execution() public {
        Fixture memory f = _fixture(false, 0);

        _executeWithFlag(f);
        assertEq(tracker.executionWalletOf(f.subId), walletAddr, "must be in execution");

        /// @dev maxGasPrice is 0, so from here on the trigger would evaluate to false.
        vm.txGasPrice(1);

        uint256 balanceBefore = balanceOf(f.subData.token, sender);

        _executeWithFlag(f);

        assertEq(
            balanceOf(f.subData.token, sender),
            balanceBefore - f.subData.amount,
            "actions must run with the trigger check skipped"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - TRACKER APPROVAL
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev _callActions approves start of executionunconditionally, once, and lets RecipeExecutor decide whether to use it.
    function test_should_approve_start_of_execution_exactly_once() public {
        Fixture memory f = _fixture(true, type(uint256).max);

        vm.expectCall(
            address(tracker),
            abi.encodeCall(SemiContinuousTracker.approveStartOfExecution, (f.subId)),
            1
        );
        _execute(f);
    }

    /// @dev Same for the DSProxy branch of _callActions, which routes through ProxyAuth.
    function test_should_approve_start_of_execution_for_ds_proxy_wallet() public {
        wallet = new SmartWallet(alice);
        walletAddr = wallet.createDSProxy();
        sender = wallet.owner();

        Fixture memory f = _fixture(true, type(uint256).max);

        vm.expectCall(
            address(tracker),
            abi.encodeCall(SemiContinuousTracker.approveStartOfExecution, (f.subId)),
            1
        );
        _execute(f);
    }

    /// @dev Approval alone starts nothing: without the flag the tracker stays empty.
    function test_should_not_start_execution_when_no_flag_is_passed() public {
        Fixture memory f = _fixture(true, type(uint256).max);

        _execute(f);

        assertFalse(tracker.isInExecution(f.subId), "approval must not start an execution");
        assertEq(tracker.executionWalletOf(f.subId), address(0));
        assertTrue(subStorage.getSub(f.subId).isEnabled, "continuous sub must stay enabled");
    }

    /// @dev The tracker is a hard dependency of every execution, semi-continuous or not: the
    ///      approval call reverts before the recipe is reached, so no action runs.
    function test_should_revert_when_tracker_is_not_registered() public {
        Fixture memory f = _fixture(false, type(uint256).max);

        redeploy("SemiContinuousTracker", address(0));

        uint256 balanceBefore = balanceOf(f.subData.token, sender);

        // call to non-contract address 0x0000000000000000000000000000000000000000
        vm.expectRevert();
        _execute(f);

        assertEq(balanceOf(f.subData.token, sender), balanceBefore, "no action must have run");
        assertTrue(subStorage.getSub(f.subId).isEnabled, "sub must stay untouched");
    }

    /// @dev The approval is keyed by subId: a recipe executing sub A cannot start sub B, even
    ///      though both are owned by the same wallet.
    function test_should_scope_approval_to_the_executed_sub() public {
        (uint256 otherSubId,) = _sub_to_dummy_strategy(
            DummySubData({ token: Addresses.WETH_ADDR, amount: 1, maxGasPrice: type(uint256).max })
        );

        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_probe_strategy();
        _add_bot_caller();

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = abi.encode(otherSubId);

        // SemiContinuousTracker::NotApproved, swallowed by the auth contract
        vm.expectRevert();
        cut.executeStrategy(subId, 0, _triggers(_probeSubData()), actionsCalldata, sub);

        assertFalse(tracker.isInExecution(otherSubId), "another sub must not be startable");
    }

    /// @dev Documents current behaviour: the approval is granted to the whole transaction, so any
    ///      action in the recipe can start the semi-continuous execution of the sub being executed,
    ///      even when the bot never passed the flag. The flag is not the only way in.
    function test_approval_leaks_to_any_action_in_the_recipe() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_probe_strategy();
        _add_bot_caller();

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = abi.encode(subId);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionStarted(subId, walletAddr);
        cut.executeStrategy(subId, 0, _triggers(_probeSubData()), actionsCalldata, sub);

        assertEq(
            tracker.executionWalletOf(subId),
            walletAddr,
            "an action started the execution without any flag"
        );
    }

    /// forge-config: default.isolate = true
    /// @dev The approval lives in transient storage, so it is gone in the next transaction.
    function test_approval_does_not_survive_the_transaction() public {
        Fixture memory f = _fixture(true, type(uint256).max);

        _execute(f);

        vm.expectRevert(
            abi.encodeWithSelector(SemiContinuousTracker.NotApproved.selector, f.subId, walletAddr)
        );
        prank(walletAddr);
        tracker.startExecution(f.subId);
    }

    /*//////////////////////////////////////////////////////////////////////////
                          TESTS - SEMI-CONTINUOUS LIFECYCLE
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev A one-time strategy executed with the flag stays subscribed and is marked in execution.
    function test_should_start_semi_continuous_execution_when_flag_is_passed() public {
        Fixture memory f = _fixture(false, type(uint256).max);

        uint256 balanceBefore = balanceOf(f.subData.token, sender);

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionStarted(f.subId, walletAddr);
        _executeWithFlag(f);

        assertEq(tracker.executionWalletOf(f.subId), walletAddr);
        assertTrue(subStorage.getSub(f.subId).isEnabled, "sub must stay enabled");
        assertEq(
            balanceOf(f.subData.token, sender),
            balanceBefore - f.subData.amount,
            "actions must still run"
        );
    }

    /// @dev Dropping the flag ends the lifecycle: the tracker is cleared and the sub deactivated.
    function test_should_finish_semi_continuous_execution_when_flag_is_omitted() public {
        Fixture memory f = _fixture(false, type(uint256).max);

        _executeWithFlag(f);
        assertTrue(tracker.isInExecution(f.subId));

        vm.expectEmit(true, true, true, true, address(tracker));
        emit SemiContinuousTracker.ExecutionFinished(f.subId, walletAddr, walletAddr);
        _execute(f);

        assertFalse(tracker.isInExecution(f.subId), "tracker must be cleared");
        assertFalse(subStorage.getSub(f.subId).isEnabled, "one-time sub must be deactivated");
    }

    /// @dev Without the flag a one-time strategy behaves as before the feature: single execution.
    function test_should_deactivate_one_time_sub_when_no_flag_is_passed() public {
        Fixture memory f = _fixture(false, type(uint256).max);

        _execute(f);

        assertFalse(subStorage.getSub(f.subId).isEnabled, "one-time sub must be deactivated");
        assertFalse(tracker.isInExecution(f.subId));

        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutorCommon.SubNotEnabled.selector, f.subId)
        );
        _execute(f);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  TESTS - BUNDLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev _strategyIndex picks the strategy inside the bundle: index 0 pulls once, index 1 twice.
    function test_should_execute_the_strategy_at_the_given_bundle_index() public {
        (uint256 subId, StrategyModel.StrategySub memory sub, DummySubData memory subData) =
            _sub_to_bundle();

        uint256 balanceBefore = balanceOf(subData.token, sender);

        cut.executeStrategy(subId, 0, _triggers(subData), _actions(subData, 1), sub);
        assertEq(
            balanceOf(subData.token, sender),
            balanceBefore - subData.amount,
            "index 0 must run the single-action strategy"
        );

        cut.executeStrategy(subId, 1, _triggers(subData), _actions(subData, 2), sub);
        assertEq(
            balanceOf(subData.token, sender),
            balanceBefore - subData.amount * 3,
            "index 1 must run the two-action strategy"
        );
    }

    /// @dev BundleStorage indexes the strategyIds array, so an index past the end panics.
    function test_should_revert_for_out_of_range_bundle_index() public {
        (uint256 subId, StrategyModel.StrategySub memory sub, DummySubData memory subData) =
            _sub_to_bundle();

        // vm.expectRevert(stdError.indexOOBError);
        // panic: array out-of-bounds access (0x32)
        vm.expectRevert();
        cut.executeStrategy(subId, 2, _triggers(subData), _actions(subData, 1), sub);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _callStrategyBaseTest() internal {
        Fixture memory f = _fixture(true, type(uint256).max);

        uint256 senderBalanceBefore = balanceOf(f.subData.token, sender);

        _execute(f);

        assertEq(balanceOf(f.subData.token, sender), senderBalanceBefore - f.subData.amount);
    }

    /// @dev The suite's default execution: strategy index 0, one action, no flag.
    function _execute(Fixture memory _fixt) internal {
        cut.executeStrategy(
            _fixt.subId, 0, _triggers(_fixt.subData), _actions(_fixt.subData, 1), _fixt.sub
        );
    }

    /// @dev Same, with the semi-continuous marker appended the way the bot does it.
    function _executeWithFlag(Fixture memory _fixt) internal {
        cut.executeStrategy(
            _fixt.subId,
            0,
            _triggers(_fixt.subData),
            _withFlag(_actions(_fixt.subData, 1)),
            _fixt.sub
        );
    }

    /// @dev Subscribes the wallet to a fresh PullToken strategy, authorizes this contract as the
    ///      bot and funds the sender for up to 4 executions.
    function _fixture(bool _continuous, uint256 _maxGasPrice)
        internal
        returns (Fixture memory fixture)
    {
        fixture.subData = DummySubData({
            token: Addresses.WETH_ADDR, amount: 1 ether, maxGasPrice: _maxGasPrice
        });

        (fixture.subId, fixture.sub) =
            _sub_to_strategy(_add_placeholder_strategy(_continuous, 1), false, fixture.subData);

        _add_bot_caller();
        _fund_sender(fixture.subData, 4);
    }

    /// @dev Bundle of two continuous strategies: index 0 pulls once, index 1 pulls twice.
    function _sub_to_bundle()
        internal
        returns (uint256 subId, StrategyModel.StrategySub memory sub, DummySubData memory subData)
    {
        uint64[] memory strategyIds = new uint64[](2);
        strategyIds[0] = uint64(_add_placeholder_strategy(true, 1));
        strategyIds[1] = uint64(_add_placeholder_strategy(true, 2));

        uint256 bundleId = new BundleBuilder().init(strategyIds);

        subData = DummySubData({
            token: Addresses.WETH_ADDR, amount: 1 ether, maxGasPrice: type(uint256).max
        });

        (subId, sub) = _sub_to_strategy(bundleId, true, subData);

        _add_bot_caller();
        _fund_sender(subData, 4);
    }

    /// @dev Sub to a strategy whose only action pokes the tracker, used to probe the approval.
    function _sub_to_probe_strategy()
        internal
        returns (uint256 subId, StrategyModel.StrategySub memory sub)
    {
        StrategyBuilder strategy = new StrategyBuilder("probeStrategy", true);
        strategy.addAction("StartExecutionAction", new string[](0));
        strategy.addTrigger("GasPriceTrigger");

        (subId, sub) = _sub_to_strategy(strategy.createStrategy(), false, _probeSubData());
    }

    function _probeSubData() internal pure returns (DummySubData memory) {
        return
            DummySubData({ token: Addresses.WETH_ADDR, amount: 0, maxGasPrice: type(uint256).max });
    }

    function _add_placeholder_strategy(bool _continuous, uint256 _numActions)
        internal
        returns (uint256)
    {
        StrategyBuilder strategy = new StrategyBuilder("dummyStrategy", _continuous);
        strategy.addSubMapping("&token");
        strategy.addSubMapping("&amount");

        string[] memory pullTokenParams = new string[](3);
        pullTokenParams[0] = "&token";
        pullTokenParams[1] = "&eoa";
        pullTokenParams[2] = "&amount";

        for (uint256 i = 0; i < _numActions; ++i) {
            strategy.addAction("PullToken", pullTokenParams);
        }

        strategy.addTrigger("GasPriceTrigger");

        return strategy.createStrategy();
    }

    function _sub_to_dummy_strategy(DummySubData memory _subData)
        internal
        returns (uint256 subId, StrategyModel.StrategySub memory sub)
    {
        return _sub_to_strategy(_add_placeholder_strategy(true, 1), false, _subData);
    }

    function _sub_to_strategy(
        uint256 _strategyOrBundleId,
        bool _isBundle,
        DummySubData memory _subData
    ) internal returns (uint256 subId, StrategyModel.StrategySub memory sub) {
        bytes32[] memory subDataEncoded = new bytes32[](2);
        subDataEncoded[0] = bytes32(uint256(uint160(_subData.token)));
        subDataEncoded[1] = bytes32(uint256(_subData.amount));

        sub = StrategyModel.StrategySub({
            strategyOrBundleId: uint64(_strategyOrBundleId),
            isBundle: _isBundle,
            triggerData: _triggers(_subData),
            subData: subDataEncoded
        });

        subId = subStorage.getSubsCount();

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = createSubEncode(sub);
        bytes4[] memory ids = new bytes4[](1);
        ids[0] = bytes4(keccak256("CreateSub"));
        uint8[][] memory paramMapping = new uint8[][](1);
        paramMapping[0] = new uint8[](sub.subData.length);

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "CreateSubRecipe",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: ids,
            paramMapping: paramMapping
        });

        wallet.execute(
            recipeExecutorAddr,
            abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe),
            0
        );
    }

    function _disable_sub(uint256 _subId, StrategyModel.StrategySub memory _sub) internal {
        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = toggleSubEncode(_subId, false);
        bytes4[] memory ids = new bytes4[](1);
        ids[0] = bytes4(keccak256("ToggleSub"));
        uint8[][] memory paramMapping = new uint8[][](1);
        paramMapping[0] = new uint8[](_sub.subData.length);

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "ToggleSubRecipe",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: ids,
            paramMapping: paramMapping
        });

        wallet.execute(
            recipeExecutorAddr,
            abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe),
            0
        );
    }

    function _add_bot_caller() internal {
        prank(Addresses.OWNER_ACC);
        BotAuth(botAuthAddr).addCaller(address(this));
    }

    function _fund_sender(DummySubData memory _subData, uint256 _executions) internal {
        give(_subData.token, sender, _subData.amount * _executions);
        approveAsSender(sender, _subData.token, walletAddr, _subData.amount * _executions);
    }

    function _triggers(DummySubData memory _subData)
        internal
        pure
        returns (bytes[] memory triggerCalldata)
    {
        triggerCalldata = new bytes[](1);
        triggerCalldata[0] =
            abi.encode(GasPriceTrigger.SubParams({ maxGasPrice: _subData.maxGasPrice }));
    }

    function _actions(DummySubData memory _subData, uint256 _numActions)
        internal
        view
        returns (bytes[] memory actionsCalldata)
    {
        actionsCalldata = new bytes[](_numActions);

        for (uint256 i = 0; i < _numActions; ++i) {
            actionsCalldata[i] = pullTokenEncode(_subData.token, sender, _subData.amount);
        }
    }

    /// @dev Appends the semi-continuous marker the bot uses to keep a one-time sub alive.
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
