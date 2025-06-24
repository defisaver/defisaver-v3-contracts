// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { DSMath } from "../DS/DSMath.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { TokenPriceHelper } from "../utils/TokenPriceHelper.sol";

/// @title Trigger contract that verifies if current token price is over/under the price specified during subscription
/// @notice If there's no chainlink oracle available for the token, price will be fetched from AaveV2, Spark and AaveV3 (in that order).
contract ChainLinkPriceTrigger is ITrigger, AdminAuth, TriggerHelper, DSMath, TokenPriceHelper {
    using TokenUtils for address;

    enum PriceState {
        OVER,
        UNDER
    }

    /// @param tokenAddr address of the token which price we trigger with
    /// @param price price in USD of the token that represents the triggerable point
    /// @param state represents if we want the current price to be higher or lower than price param
    struct SubParams {
        address tokenAddr;
        uint256 price;
        uint8 state;
    }

    /// @notice Checks chainlink oracle for current price and triggers if it's in a correct state.
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currPrice = getPriceInUSD(triggerSubData.tokenAddr);
        
        /// @dev if currPrice is 0, we failed fetching the price
        if (currPrice == 0) return false;

        if (PriceState(triggerSubData.state) == PriceState.OVER) {
            if (currPrice > triggerSubData.price) return true;
        }

        if (PriceState(triggerSubData.state) == PriceState.UNDER) {
            if (currPrice < triggerSubData.price) return true;
        }

        return false;
    }

    
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _callData) public pure returns (SubParams memory params) {
        params = abi.decode(_callData, (SubParams));
    }
}
