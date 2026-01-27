// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { TokenPriceHelper } from "../utils/token/TokenPriceHelper.sol";

/// @title Trigger contract that verifies if the current price of token is outside of given range
contract ClosePriceTrigger is ITrigger, AdminAuth, TriggerHelper, TokenPriceHelper {
    /// @param tokenAddr address of the token
    /// @param lowerPrice lower price of the token
    /// @param upperPrice upper price of the token
    struct SubParams {
        address tokenAddr;
        uint256 lowerPrice;
        uint256 upperPrice;
    }

    /// @notice Checks chainlink oracle for current price and triggers if it's outside lower-upper price range
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currPrice = getPriceInUSD(triggerSubData.tokenAddr);

        /// @dev if currPrice is 0, we failed fetching the price
        if (currPrice == 0) return false;

        /// @dev only check lowerPrice if upperPrice is not set
        if (triggerSubData.upperPrice == 0) {
            return currPrice < triggerSubData.lowerPrice;
        }

        return currPrice < triggerSubData.lowerPrice || currPrice > triggerSubData.upperPrice;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
