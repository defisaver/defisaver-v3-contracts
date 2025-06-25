// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TransientStorage } from "../utils/TransientStorage.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title Trigger that triggers when the price of a token is over or under a limit price.
contract OffchainPriceTrigger is ITrigger, AdminAuth, TriggerHelper {

    enum OrderType { TAKE_PROFIT, STOP_LOSS }

    /// @param limitPrice limit price that represents the triggerable point
    /// @param goodUntilTimestamp timestamp until which the trigger is valid
    /// @param orderType type of the order (TAKE_PROFIT or STOP_LOSS)
    struct SubParams {
        uint256 limitPrice;
        uint256 goodUntilTimestamp;
        OrderType orderType;
    }

    struct CallParams {
        uint256 currentPrice;
    }

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    function isTriggered(bytes memory _callData, bytes memory _subData) public override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);
        CallParams memory callParams = parseCallInputs(_callData);
        
        // Limit order has expired
        if (block.timestamp > triggerSubData.goodUntilTimestamp) return false;

        // Sanity check, price can't be 0
        if (callParams.currentPrice == 0) return false;

        if (triggerSubData.orderType == OrderType.TAKE_PROFIT) {
            // if sell order (type take profit) execute if current price is equal or higher than limit price
            if (callParams.currentPrice >= triggerSubData.limitPrice) {
                tempStorage.setBytes32("CURR_PRICE", bytes32(callParams.currentPrice));

                return true;
            }
        }

        if (triggerSubData.orderType == OrderType.STOP_LOSS) {
            // if sell order (type stop loss) execute if current price is lower or equal than limit price
            if (callParams.currentPrice <= triggerSubData.limitPrice) {
                tempStorage.setBytes32("CURR_PRICE", bytes32(callParams.currentPrice));

                return true;
            }
        }

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function parseCallInputs(bytes memory _callData)
        internal
        pure
        returns (CallParams memory params)
    {
        params = abi.decode(_callData, (CallParams));
    }
}
