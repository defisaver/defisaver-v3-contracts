// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
import "../core/strategy/StrategyModel.sol";
import "../core/DFSRegistry.sol";
import "../core/strategy/BundleStorage.sol";
import "../core/strategy/StrategyStorage.sol";
import "../interfaces/ITrigger.sol";

contract StrategyTriggerView is StrategyModel, CoreHelper {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    function checkTriggers(
        StrategySub memory _sub,
        bytes[] calldata _triggerCallData
    ) public returns (bool) {
        Strategy memory strategy;

        {
            // to handle stack too deep
            uint256 strategyId = _sub.strategyOrBundleId;

            if (_sub.isBundle) {
                strategyId = BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(
                    _sub.strategyOrBundleId,
                    0
                );
            }

            strategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(strategyId);
        }

        bytes4[] memory triggerIds = strategy.triggerIds;

        bool isTriggered;
        address triggerAddr;

        for (uint256 i = 0; i < triggerIds.length; i++) {
            triggerAddr = registry.getAddr(triggerIds[i]);
            isTriggered = ITrigger(triggerAddr).isTriggered(
                _triggerCallData[i],
                _sub.triggerData[i]
            );
            if (!isTriggered) return false;
        }
        return true;
    }

    enum TriggerStatus {
        TRUE,
        FALSE,
        REVERT
    }

    function checkTriggersDetailed(
        StrategySub memory _sub,
        bytes[] calldata _triggerCallData
    ) public returns (TriggerStatus[] memory) {
        Strategy memory strategy;

        {
            // to handle stack too deep
            uint256 strategyId = _sub.strategyOrBundleId;

            if (_sub.isBundle) {
                strategyId = BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(
                    _sub.strategyOrBundleId,
                    0
                );
            }

            strategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(strategyId);
        }

        bytes4[] memory triggerIds = strategy.triggerIds;

        address triggerAddr;

        TriggerStatus[] memory triggerStatuses = new TriggerStatus[](strategy.triggerIds.length);

        for (uint256 i = 0; i < triggerIds.length; i++) {
            triggerAddr = registry.getAddr(triggerIds[i]);
            try
                ITrigger(triggerAddr).isTriggered(_triggerCallData[i], _sub.triggerData[i])
            returns (bool isTriggered) {
                if (isTriggered) {
                    triggerStatuses[i] = TriggerStatus.TRUE;
                } else {
                    triggerStatuses[i] = TriggerStatus.FALSE;
                }
            } catch {
                triggerStatuses[i] = TriggerStatus.REVERT;
            }
        }

        return triggerStatuses;
    }
}
