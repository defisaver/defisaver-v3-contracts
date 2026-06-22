// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { RegistryUtils } from "../utils/RegistryUtils.sol";
import {
    StrategyTriggerViewNoRevert
} from "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";
import { BundleStorage } from "../../contracts/core/strategy/BundleStorage.sol";
import { StrategyStorage } from "../../contracts/core/strategy/StrategyStorage.sol";
import { AaveV3MinDebtTrigger } from "../../contracts/triggers/AaveV3MinDebtTrigger.sol";
import { AaveV3RatioTrigger } from "../../contracts/triggers/AaveV3RatioTrigger.sol";
import { ITrigger } from "../../contracts/interfaces/core/ITrigger.sol";

contract TestStrategyTriggerViewNoRevert is BaseTest, RegistryUtils, StrategyTriggerViewNoRevert {
    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Smart wallet that owns the AaveV3 position behind the real repay sub (subId 2154).
    address internal constant AAVE_V3_POSITION_OWNER = 0x2D407e8245664BA6485a16CFDDdC62CA24218070;

    /// @dev AaveV3 repay bundle the sub is subscribed to on mainnet.
    uint64 internal constant AAVE_V3_REPAY_BUNDLE_ID = 8;

    /// @dev Mainnet AaveV3 main market (PoolAddressesProvider), the market the sub points at.
    address internal constant AAVE_V3_MARKET = 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e;

    /// @dev Registry id the additional AaveV3MinDebtTrigger is registered under in setUp.
    bytes4 internal constant AAVE_V3_MIN_DEBT_TRIGGER_ID =
        bytes4(keccak256("AaveV3MinDebtTrigger"));

    /// @dev minDebt is expressed in whole USD (no decimals). 5000 == 5000 USD, the production floor.
    uint256 internal constant MIN_DEBT = 5000;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3MinDebtTrigger internal aaveV3MinDebtTrigger;

    /// @dev Sub trigger (AaveV3RatioTrigger) address resolved from the repay bundle - mock target.
    address internal ratioTriggerAddr;

    /// @dev Additional trigger (AaveV3MinDebtTrigger) address registered in setUp - mock target.
    address internal minDebtTriggerAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("StrategyTriggerViewNoRevert");

        if (!isMainnetSelected()) {
            vm.skip(true, "StrategyTriggerViewNoRevert test is mainnet only");
        }

        aaveV3MinDebtTrigger = new AaveV3MinDebtTrigger();
        redeploy("AaveV3MinDebtTrigger", address(aaveV3MinDebtTrigger));
        minDebtTriggerAddr = address(aaveV3MinDebtTrigger);

        ratioTriggerAddr = _resolveSubTriggerAddr(AAVE_V3_REPAY_BUNDLE_ID);
    }

    /*//////////////////////////////////////////////////////////////////////////
                       TESTS - checkTriggers (ratio x min debt)
    //////////////////////////////////////////////////////////////////////////*/
    // ratio TRUE -> the additional (min debt) trigger decides the outcome.
    function test_checkTriggers_ratioTrue_minDebtTrue_returnsTrue() public {
        _assertCombination(TriggerStatus.TRUE, TriggerStatus.TRUE, TriggerStatus.TRUE);
    }

    function test_checkTriggers_ratioTrue_minDebtFalse_returnsFalse() public {
        _assertCombination(TriggerStatus.TRUE, TriggerStatus.FALSE, TriggerStatus.FALSE);
    }

    function test_checkTriggers_ratioTrue_minDebtRevert_returnsRevert() public {
        _assertCombination(TriggerStatus.TRUE, TriggerStatus.REVERT, TriggerStatus.REVERT);
    }

    // ratio FALSE -> short-circuits to FALSE, additional trigger is never evaluated.
    function test_checkTriggers_ratioFalse_minDebtTrue_returnsFalse() public {
        _assertCombination(TriggerStatus.FALSE, TriggerStatus.TRUE, TriggerStatus.FALSE);
    }

    function test_checkTriggers_ratioFalse_minDebtFalse_returnsFalse() public {
        _assertCombination(TriggerStatus.FALSE, TriggerStatus.FALSE, TriggerStatus.FALSE);
    }

    function test_checkTriggers_ratioFalse_minDebtRevert_returnsFalse() public {
        _assertCombination(TriggerStatus.FALSE, TriggerStatus.REVERT, TriggerStatus.FALSE);
    }

    // ratio REVERT -> short-circuits to REVERT, additional trigger is never evaluated.
    function test_checkTriggers_ratioRevert_minDebtTrue_returnsRevert() public {
        _assertCombination(TriggerStatus.REVERT, TriggerStatus.TRUE, TriggerStatus.REVERT);
    }

    function test_checkTriggers_ratioRevert_minDebtFalse_returnsRevert() public {
        _assertCombination(TriggerStatus.REVERT, TriggerStatus.FALSE, TriggerStatus.REVERT);
    }

    function test_checkTriggers_ratioRevert_minDebtRevert_returnsRevert() public {
        _assertCombination(TriggerStatus.REVERT, TriggerStatus.REVERT, TriggerStatus.REVERT);
    }

    /// @dev No additional triggers (empty arrays); the result is driven purely by the sub trigger.
    function test_checkTriggers_noAdditionalTriggers_returnsSubTriggerOutcome() public {
        _mockTriggerOutcome(ratioTriggerAddr, TriggerStatus.TRUE);

        TriggerStatus status = this.checkTriggers(
            _aaveV3RepaySub(), _emptySubTriggerCallData(), new bytes4[](0), new bytes[](0)
        );

        assertEq(
            uint256(status), uint256(TriggerStatus.TRUE), "no additional triggers -> sub outcome"
        );
    }

    /// @dev Additional trigger id is unregistered (resolves to address(0)); the guard maps it to
    ///      REVERT instead of letting the high-level call revert the whole tx.
    function test_checkTriggers_unregisteredAdditionalTrigger_returnsRevert() public {
        _mockTriggerOutcome(ratioTriggerAddr, TriggerStatus.TRUE);

        bytes4[] memory additionalIds = new bytes4[](1);
        additionalIds[0] = bytes4(keccak256("NonExistentTrigger"));

        bytes[] memory additionalCallData = new bytes[](1);
        additionalCallData[0] = bytes("");

        TriggerStatus status = this.checkTriggers(
            _aaveV3RepaySub(), _emptySubTriggerCallData(), additionalIds, additionalCallData
        );

        assertEq(
            uint256(status), uint256(TriggerStatus.REVERT), "unregistered id should map to REVERT"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Mocks the ratio + min debt trigger outcomes, runs checkTriggers and asserts the result.
    function _assertCombination(
        TriggerStatus _ratioOutcome,
        TriggerStatus _minDebtOutcome,
        TriggerStatus _expected
    ) internal {
        _mockTriggerOutcome(ratioTriggerAddr, _ratioOutcome);
        _mockTriggerOutcome(minDebtTriggerAddr, _minDebtOutcome);

        (bytes4[] memory additionalIds, bytes[] memory additionalCallData) =
            _minDebtAdditionalTrigger(MIN_DEBT);

        TriggerStatus status = this.checkTriggers(
            _aaveV3RepaySub(), _emptySubTriggerCallData(), additionalIds, additionalCallData
        );

        assertEq(uint256(status), uint256(_expected), "unexpected checkTriggers outcome");
    }

    /// @dev Mocks ITrigger.isTriggered on a trigger address to return a bool, or to revert.
    function _mockTriggerOutcome(address _trigger, TriggerStatus _outcome) internal {
        bytes memory isTriggeredCall = abi.encodeWithSelector(ITrigger.isTriggered.selector);

        if (_outcome == TriggerStatus.REVERT) {
            vm.mockCallRevert(_trigger, isTriggeredCall, bytes("MOCK_TRIGGER_REVERT"));
        } else {
            vm.mockCall(_trigger, isTriggeredCall, abi.encode(_outcome == TriggerStatus.TRUE));
        }
    }

    /// @dev Resolves the (single) sub trigger address for a bundle's first strategy.
    function _resolveSubTriggerAddr(uint64 _bundleId) internal view returns (address) {
        uint256 strategyId = BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(_bundleId, 0);
        Strategy memory strategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(strategyId);
        require(strategy.triggerIds.length == 1, "expected single ratio sub trigger");
        return registry.getAddr(strategy.triggerIds[0]);
    }

    /// @dev Reconstructs the real subId 2154 StrategySub. Trigger calls are mocked, so the encoded
    ///      values just document the real repay sub; checkTriggers only relies on triggerData length.
    function _aaveV3RepaySub() internal pure returns (StrategySub memory sub) {
        sub.strategyOrBundleId = AAVE_V3_REPAY_BUNDLE_ID;
        sub.isBundle = true;

        sub.triggerData = new bytes[](1);
        sub.triggerData[0] = abi.encode(
            AaveV3RatioTrigger.SubParams({
                user: AAVE_V3_POSITION_OWNER,
                market: AAVE_V3_MARKET,
                ratio: 1.05e18, // trigger repay when safety ratio drops under 105%
                state: uint8(AaveV3RatioTrigger.RatioState.UNDER)
            })
        );

        sub.subData = new bytes32[](4);
        sub.subData[0] = bytes32(uint256(1.2e18)); // target ratio 120%
        sub.subData[1] = bytes32(uint256(1));
        sub.subData[2] = bytes32(uint256(1));
        sub.subData[3] = bytes32(uint256(0));
    }

    /// @dev AaveV3RatioTrigger reads only the sub data, so the per-trigger calldata is empty.
    function _emptySubTriggerCallData() internal pure returns (bytes[] memory callData) {
        callData = new bytes[](1);
        callData[0] = bytes("");
    }

    function _minDebtCalldata(uint256 _minDebt) internal pure returns (bytes memory) {
        return abi.encode(
            AaveV3MinDebtTrigger.CalldataParams({
                user: AAVE_V3_POSITION_OWNER, market: AAVE_V3_MARKET, minDebt: _minDebt
            })
        );
    }

    function _minDebtAdditionalTrigger(uint256 _minDebt)
        internal
        pure
        returns (bytes4[] memory ids, bytes[] memory callData)
    {
        ids = new bytes4[](1);
        ids[0] = AAVE_V3_MIN_DEBT_TRIGGER_ID;

        callData = new bytes[](1);
        callData[0] = _minDebtCalldata(_minDebt);
    }
}
