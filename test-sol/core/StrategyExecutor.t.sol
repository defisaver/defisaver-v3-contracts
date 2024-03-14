// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import {SafeModuleAuth} from "../../contracts/core/strategy/SafeModuleAuth.sol";
import {ProxyAuth} from '../../contracts/core/strategy/ProxyAuth.sol';
import {BotAuth} from '../../contracts/core/strategy/BotAuth.sol';
import {StrategyExecutor} from '../../contracts/core/strategy/StrategyExecutor.sol';
import {RecipeExecutor} from '../../contracts/core/RecipeExecutor.sol';
import {SubStorage} from '../../contracts/core/strategy/SubStorage.sol';
import {StrategyModel} from '../../contracts/core/strategy/StrategyModel.sol';
import {SubProxy} from '../../contracts/core/strategy/SubProxy.sol';

import {GasPriceTrigger} from '../../contracts/triggers/GasPriceTrigger.sol';
import {PullToken} from "../../contracts/actions/utils/PullToken.sol";

import {BaseTest} from '../utils/BaseTest.sol';
import {RegistryUtils} from '../utils/RegistryUtils.sol';
import {ActionsUtils} from '../utils/ActionsUtils.sol';
import {SmartWallet} from '../utils/SmartWallet.sol';
import {Const} from '../Const.sol';
import {TokenAddresses} from '../TokenAddresses.sol';
import {StrategyBuilder} from '../utils/StrategyBuilder.sol';

contract TestCore_StrategyExecutor is RegistryUtils, ActionsUtils, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    StrategyExecutor cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    address subProxyAddr;
    address botAuthAddr;

    SubStorage subStorage;

    struct DummySubData {
        address token;
        uint256 amount;
        uint256 maxGasPrice;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        cut = new StrategyExecutor();
        subStorage = SubStorage(SUB_STORAGE_ADDR);

        vm.etch(RECIPE_EXECUTOR_ADDR, address(new RecipeExecutor()).code);
        vm.etch(MODULE_AUTH_ADDR, address(new SafeModuleAuth()).code);
        vm.etch(PROXY_AUTH_ADDR, address(new ProxyAuth()).code);

        subProxyAddr = address(new SubProxy());
        botAuthAddr = address(new BotAuth());

        redeploy('StrategyExecutorID', address(cut));
        redeploy('PullToken', address(new PullToken()));
        redeploy('GasPriceTrigger', address(new GasPriceTrigger()));
        redeploy('SubProxy', subProxyAddr);
        redeploy('BotAuth', botAuthAddr);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_call_execute_when_sender_is_not_authorized_bot() public {
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutor.BotNotApproved.selector, address(this), 0)
        );
        StrategyModel.StrategySub memory dummySub;
        cut.executeStrategy(0, 0, new bytes[](0), new bytes[](0), dummySub);
    }

    function test_should_fail_to_call_execute_when_sub_data_hash_mismatch() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(
            DummySubData({
                token: TokenAddresses.WETH_ADDR,
                amount: 1,
                maxGasPrice: type(uint256).max
            })
        );

        bytes32 storedSubHash = keccak256(abi.encode(sub));
        sub.strategyOrBundleId = 1;
        bytes32 changedSubHash = keccak256(abi.encode(sub));

        _add_bot_caller();

        vm.expectRevert(
            abi.encodeWithSelector(
                StrategyExecutor.SubDatHashMismatch.selector,
                subId,
                changedSubHash,
                storedSubHash
            )
        );
        cut.executeStrategy(subId, 0, new bytes[](0), new bytes[](0), sub);
    }

    function test_should_fail_to_call_execute_when_sub_is_not_enabled() public {
        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(
            DummySubData({
                token: TokenAddresses.WETH_ADDR,
                amount: 1,
                maxGasPrice: type(uint256).max
            })
        );

        _disable_sub(subId);

        _add_bot_caller();

        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.SubNotEnabled.selector, subId));
        cut.executeStrategy(subId, 0, new bytes[](0), new bytes[](0), sub);
    }

    function test_should_call_strategy() public {
        DummySubData memory subData = DummySubData({
            token: TokenAddresses.WETH_ADDR,
            amount: 1 ether,
            maxGasPrice: type(uint256).max
        });

        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(subData);

        _add_bot_caller();

        give(subData.token, sender, subData.amount * 2);
        approveAsSender(sender, subData.token, walletAddr, subData.amount);

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = pullTokenEncode(subData.token, sender, subData.amount);

        bytes[] memory triggerCalldata = new bytes[](1);
        triggerCalldata[0] = abi.encode(GasPriceTrigger.SubParams({maxGasPrice: subData.maxGasPrice}));

        uint256 strategyIndex = 0;

        uint256 senderBalanceBefore = balanceOf(subData.token, sender);

        cut.executeStrategy(
            subId,
            strategyIndex,
            triggerCalldata,
            actionsCalldata,
            sub
        );

        uint256 senderBalanceAfter = balanceOf(subData.token, sender);

        assertEq(senderBalanceAfter, senderBalanceBefore - subData.amount);
    }

    function test_should_fail_to_execute_strategy_for_inactive_triggers() public {
        DummySubData memory subData = DummySubData({
            token: TokenAddresses.WETH_ADDR,
            amount: 1,
            maxGasPrice: 0
        });

        (uint256 subId, StrategyModel.StrategySub memory sub) = _sub_to_dummy_strategy(subData);

        _add_bot_caller();

        give(subData.token, sender, subData.amount);
        approveAsSender(sender, subData.token, walletAddr, subData.amount);

        bytes[] memory actionsCalldata = new bytes[](1);
        actionsCalldata[0] = pullTokenEncode(subData.token, sender, subData.amount);

        bytes[] memory triggerCalldata = new bytes[](1);
        triggerCalldata[0] = abi.encode(GasPriceTrigger.SubParams({maxGasPrice: subData.maxGasPrice}));

        uint256 strategyIndex = 0;

        ///@dev Set higher gas price than maxGasPrice. This will make the trigger inactive. 
        vm.txGasPrice(1);

        /// @dev Inner revert which we can't catch. Generic revert will be bubbled up.
        //vm.expectRevert(abi.encodeWithSelector(RecipeExecutor.TriggerNotActiveError.selector, 0));
        vm.expectRevert();
        cut.executeStrategy(
            subId,
            strategyIndex,
            triggerCalldata,
            actionsCalldata,
            sub
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _add_placeholder_strategy() internal returns (uint256) {
        StrategyBuilder strategy = new StrategyBuilder('dummyStrategy', true);
        strategy.addSubMapping('&token');
        strategy.addSubMapping('&amount');

        string[] memory pullTokenParams = new string[](3);
        pullTokenParams[0] = '&token';
        pullTokenParams[1] = '&eoa';
        pullTokenParams[2] = '&amount';
        strategy.addAction('PullToken', pullTokenParams);

        strategy.addTrigger('GasPriceTrigger');

        return strategy.createStrategy();
    }

    function _sub_to_dummy_strategy(DummySubData memory _subData) 
        internal returns (uint256 subId, StrategyModel.StrategySub memory sub) 
    {
        uint256 strategyId = _add_placeholder_strategy();

        bytes[] memory _triggerData = new bytes[](1);
        _triggerData[0] = abi.encode(GasPriceTrigger.SubParams({maxGasPrice: _subData.maxGasPrice}));

        bytes32[] memory subDataEncoded = new bytes32[](2);
        subDataEncoded[0] = bytes32(uint256(uint160(_subData.token)));
        subDataEncoded[1] = bytes32(uint256(_subData.amount));

        sub = StrategyModel.StrategySub({
            strategyOrBundleId: uint64(strategyId),
            isBundle: false,
            triggerData: _triggerData,
            subData: subDataEncoded
        });

        subId = subStorage.getSubsCount();

        wallet.execute(
            subProxyAddr,
            abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, sub),
            0
        );
    }

    function _disable_sub(uint256 _subId) internal {
        wallet.execute(
            subProxyAddr,
            abi.encodeWithSelector(SubProxy.deactivateSub.selector, _subId),
            0
        );
    }

    function _add_bot_caller() internal {
        prank(Const.OWNER_ACC);
        BotAuth(botAuthAddr).addCaller(address(this));
    }
}
