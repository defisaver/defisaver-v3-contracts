// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { DFSRegistry } from "../../core/DFSRegistry.sol";
import { BundleStorage } from "../../core/strategy/BundleStorage.sol";
import { StrategyStorage } from "../../core/strategy/StrategyStorage.sol";
import { ITrigger } from "../../interfaces/ITrigger.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract StrategyTriggerView is StrategyModel, CoreHelper {

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    function checkTriggers(
        StrategySub memory _sub,
        bytes[] calldata _triggerCallData
    ) public returns (bool) {
        Strategy memory strategy;

        { // to handle stack too deep
            uint256 strategyId = _sub.strategyOrBundleId;

            if (_sub.isBundle) {
                strategyId = BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(_sub.strategyOrBundleId, 0);
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
}