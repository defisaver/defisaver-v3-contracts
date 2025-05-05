// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/IERC20.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { BundleStorage } from "../core/strategy/BundleStorage.sol";
import { CheckWalletType } from "../utils/CheckWalletType.sol";
import { DSProxy } from "../DS/DSProxy.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { StrategyStorage } from "../core/strategy/StrategyStorage.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";

contract StrategyTriggerViewNoRevert is StrategyModel, CoreHelper, CheckWalletType {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    using TokenUtils for address;

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
        address smartWallet
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

        if (isDCAStrategy(_sub.strategyOrBundleId) || isLimitOrderStrategy(_sub.strategyOrBundleId)) {
            return verifyRequiredAmountAndAllowance(smartWallet, _sub.subData);
        }

        return TriggerStatus.TRUE;
    }

    function isLimitOrderStrategy(uint256 _strategyID) view internal returns (bool) {
        if (block.chainid == 1 && _strategyID == 51) {
           return true;
        }

        if ((block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) && _strategyID == 9) {
            return true;
        }

        return false;
    }

    function isDCAStrategy(uint256 _strategyID) view internal returns (bool) {
        if (block.chainid == 1 && _strategyID == 46) {
            return true;
        }

        if ((block.chainid == 42161 || block.chainid == 10 || block.chainid == 8453) && _strategyID == 8) {
            return true;
        }

        return false;
    }

    function verifyRequiredAmountAndAllowance(
        address _smartWallet,
        bytes32[] memory _subData
    ) internal view returns (TriggerStatus)  {
        address sellTokenAddr = address(uint160(uint256(_subData[0])));
        uint256 desiredAmount = uint256(_subData[2]);

        address tokenHolder = fetchTokenHolder(_smartWallet);
        bool hasEnoughBalance = sellTokenAddr.getBalance(tokenHolder) >= desiredAmount;

        if (tokenHolder != _smartWallet) {
            uint256 currentAllowance = IERC20(sellTokenAddr).allowance(tokenHolder, _smartWallet);
            bool hasEnoughAllowance = currentAllowance >= desiredAmount;
            return (hasEnoughBalance && hasEnoughAllowance) ? TriggerStatus.TRUE : TriggerStatus.FALSE;
        }

        return hasEnoughBalance ? TriggerStatus.TRUE : TriggerStatus.FALSE;
    }

     function fetchTokenHolder(
        address _subWallet
    ) internal view returns (address) {
        if (isDSProxy(_subWallet)) {
            return DSProxy(payable(_subWallet)).owner();
        }
        // if not DSProxy, we assume we are in context of Safe
        address[] memory owners = ISafe(_subWallet).getOwners();
        return owners.length == 1 ? owners[0] : _subWallet;
    }
}
