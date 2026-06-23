// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ITrigger } from "../../interfaces/core/ITrigger.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";

import { BundleStorage } from "../../core/strategy/BundleStorage.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { StrategyStorage } from "../../core/strategy/StrategyStorage.sol";

/// @title StrategyTriggerViewNoRevert - Helper contract to check whether a trigger is triggered or not for a given sub.
/// @dev This contract is designed to avoid reverts from checking triggers.
contract StrategyTriggerViewNoRevert is StrategyModel, CoreHelper {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    enum TriggerStatus {
        FALSE,
        TRUE,
        REVERT
    }

    /*//////////////////////////////////////////////////////////////
                             PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /// @notice Check if a single trigger is triggered or not.
    /// @dev This function uses high level `isTriggered` call with try-catch to avoid revert.
    /// @param triggerId - The ID of the trigger to check.
    /// @param triggerCalldata - The calldata to pass to the trigger.
    /// @param triggerSubData - The sub data to pass to the trigger.
    /// @return TriggerStatus - The status of the trigger (FALSE, TRUE, REVERT).
    function checkSingleTrigger(
        bytes4 triggerId,
        bytes memory triggerCalldata,
        bytes memory triggerSubData
    ) public returns (TriggerStatus) {
        address triggerAddr = registry.getAddr(triggerId);

        if (triggerAddr == address(0)) return TriggerStatus.REVERT;

        try ITrigger(triggerAddr).isTriggered(triggerCalldata, triggerSubData) returns (
            bool isTriggered
        ) {
            if (!isTriggered) {
                return TriggerStatus.FALSE;
            } else {
                return TriggerStatus.TRUE;
            }
        } catch {
            return TriggerStatus.REVERT;
        }
    }

    /// @notice Check if a single trigger is triggered or not.
    /// @dev This function uses low level `call` with try-catch to avoid revert.
    /// @param triggerId - The ID of the trigger to check.
    /// @param txData - The calldata to pass to the trigger.
    /// @return TriggerStatus - The status of the trigger (FALSE, TRUE, REVERT).
    function checkSingleTriggerLowLevel(bytes4 triggerId, bytes memory txData)
        public
        returns (TriggerStatus)
    {
        address triggerAddr = registry.getAddr(triggerId);

        if (triggerAddr == address(0)) return TriggerStatus.REVERT;

        (bool success, bytes memory data) = triggerAddr.call(txData);

        if (success) {
            bool isTriggered = abi.decode(data, (bool));
            if (isTriggered) {
                return TriggerStatus.TRUE;
            } else {
                return TriggerStatus.FALSE;
            }
        } else {
            return TriggerStatus.REVERT;
        }
    }

    /// @notice Check if a strategy is triggered or not for a given sub
    /// @dev This function uses high level `isTriggered` call with try-catch to avoid revert.
    /// @param _sub - The subscription to check.
    /// @param _triggerCallData - The calldata to pass to the triggers.
    /// @param _additionalTriggerIds - The additional trigger IDs to check
    /// @param _additionalTriggerCallData - The calldata to pass to the additional triggers.
    /// @return TriggerStatus - The status of the trigger (FALSE, TRUE, REVERT).
    function checkTriggers(
        StrategySub memory _sub,
        bytes[] calldata _triggerCallData,
        bytes4[] calldata _additionalTriggerIds,
        bytes[] calldata _additionalTriggerCallData
    ) public returns (TriggerStatus) {
        Strategy memory strategy;

        uint256 strategyId = _sub.strategyOrBundleId;
        if (_sub.isBundle) {
            strategyId =
                BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(_sub.strategyOrBundleId, 0);
        }
        strategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(strategyId);

        bytes4[] memory triggerIds = strategy.triggerIds;
        TriggerStatus subTriggers = _checkTriggers(triggerIds, _triggerCallData, _sub.triggerData);
        if (subTriggers != TriggerStatus.TRUE) return subTriggers;

        // We check for additional triggers only if sub TriggerStatus is TRUE
        bytes[] memory bytesPlaceholder = new bytes[](_additionalTriggerIds.length);
        return _checkTriggers(_additionalTriggerIds, _additionalTriggerCallData, bytesPlaceholder);
    }

    function _checkTriggers(
        bytes4[] memory _triggerIds,
        bytes[] memory _triggerCallData,
        bytes[] memory _subTriggerData
    ) internal returns (TriggerStatus) {
        address triggerAddr;
        for (uint256 i = 0; i < _triggerIds.length; i++) {
            triggerAddr = registry.getAddr(_triggerIds[i]);
            if (triggerAddr == address(0)) return TriggerStatus.REVERT;

            try ITrigger(triggerAddr).isTriggered(_triggerCallData[i], _subTriggerData[i]) returns (
                bool isTriggered
            ) {
                if (!isTriggered) {
                    return TriggerStatus.FALSE;
                }
            } catch {
                return TriggerStatus.REVERT;
            }
        }

        return TriggerStatus.TRUE;
    }
}
