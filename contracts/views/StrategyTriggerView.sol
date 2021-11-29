// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
import "../core/strategy/StrategyModel.sol";
import "../core/DFSRegistry.sol";
import "../core/strategy/BundleStorage.sol";
import "../core/strategy/StrategyStorage.sol";
import "../interfaces/ITrigger.sol";



contract StrategyTriggerView is StrategyModel {
    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));
    bytes4 constant SUB_STORAGE_ID = bytes4(keccak256("SubStorage"));
    bytes4 constant BUNDLE_STORAGE_ID = bytes4(keccak256("BundleStorage"));
        
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