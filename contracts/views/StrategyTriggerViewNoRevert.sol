// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { BundleStorage } from "../core/strategy/BundleStorage.sol";
import { StrategyStorage } from "../core/strategy/StrategyStorage.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { CheckWalletType } from "../utils/CheckWalletType.sol";

contract StrategyTriggerViewNoRevert is StrategyModel, CoreHelper, CheckWalletType {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    enum TriggerStatus {
        FALSE,
        TRUE,
        REVERT
    }

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

    function checkSingleTriggerLowLevel(
        bytes4 triggerId,
        bytes memory txData
    ) public returns (TriggerStatus) {
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

    function checkTriggers(
        StrategySub memory _sub,
        bytes[] calldata _triggerCallData,
        address memory subWallet
    ) public returns (TriggerStatus) {
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

        for (uint256 i = 0; i < triggerIds.length; i++) {
            triggerAddr = registry.getAddr(triggerIds[i]);
            try
            ITrigger(triggerAddr).isTriggered(_triggerCallData[i], _sub.triggerData[i])
            returns (bool isTriggered) {
                if (!isTriggered) {
                    return TriggerStatus.FALSE;
                }
            } catch {
                return TriggerStatus.REVERT;
            }
        }

//        if (isSpecialCaseStrategy(strategyId)) {
//            return verifyRequiredAmount(0x0, _sub.subData);
//        }

        return TriggerStatus.TRUE;
    }

        }

        return false;
    }

    function verifyRequiredAmount(
        address memory _subbedWallet,
        bytes32[] memory _subData
    ) public internal returns (TriggerStatus)  {
        address memory sellTokenAddr = _subData[0];
        uint256 memory desiredAmount = _subData[2];

        uint256 memory currentUserBalance = TokenUtils.getBalance(sellTokenAddr, _subbedWallet);
        if (currentUserBalance < desiredAmount) {
            return TriggerStatus.FALSE;
        } else {
            return TriggerStatus.TRUE;
        }

        return TriggerStatus.REVERT;
    }

}
