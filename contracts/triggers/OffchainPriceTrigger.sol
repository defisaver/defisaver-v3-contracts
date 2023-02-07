// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../utils/TransientStorage.sol";
import "./helpers/TriggerHelper.sol";

contract OffchainPriceTrigger is ITrigger, AdminAuth, TriggerHelper {

    enum OrderType { BUY, SELL }

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
        SubParams memory triggerSubData = parseInputs(_subData);
        CallParams memory callParams = parseCallInputs(_callData);
        
        // Limit order has expired
        if (block.timestamp > triggerSubData.goodUntilTimestamp) return false;

        // Sanity check, price can't be 0
        if (callParams.currentPrice == 0) return false;

        // if sell order execute if current price is equal or higher than limit price
        if (callParams.currentPrice >= triggerSubData.limitPrice && triggerSubData.orderType == OrderType.SELL) {
            tempStorage.setBytes32("CURR_PRICE", bytes32(callParams.currentPrice));

            return true;
        }

        // if buy order execute if current price is equal or lower than limit price
        if (callParams.currentPrice <= triggerSubData.limitPrice && triggerSubData.orderType == OrderType.BUY) {
            tempStorage.setBytes32("CURR_PRICE", bytes32(callParams.currentPrice));

            return true;
        }

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseInputs(bytes memory _subData) public pure returns (SubParams memory params) {
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
