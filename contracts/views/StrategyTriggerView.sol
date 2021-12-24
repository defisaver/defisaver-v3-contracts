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

        { // to handle stack too deep
            uint256 strategyId = _sub.id;
            address bundleStorageAddr = registry.getAddr(BUNDLE_STORAGE_ID);
            address strategyStorageAddr = registry.getAddr(STRATEGY_STORAGE_ID);

            if (_sub.isBundle) {
                strategyId = BundleStorage(bundleStorageAddr).getStrategyId(_sub.id, 0);
            }

            strategy = StrategyStorage(strategyStorageAddr).getStrategy(strategyId);
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