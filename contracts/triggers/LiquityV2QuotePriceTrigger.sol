// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { ITroveManager } from "../interfaces/liquityV2/ITroveManager.sol";
import { IAddressesRegistry } from "../interfaces/liquityV2/IAddressesRegistry.sol";
import { IPriceFeed } from "../interfaces/liquityV2/IPriceFeed.sol";

/// @title Trigger contract that verifies if price of collateral on a chosen LiquityV2 market went over or under a certain threshold
contract LiquityV2QuotePriceTrigger is 
    ITrigger,
    AdminAuth,
    TriggerHelper
{
    enum PriceState {
        OVER,
        UNDER
    }

    /// @param market address of the market where the trove is
    /// @param price threshold price that represents the triggerable point
    /// @param state represents if we want the current state to be higher or lower than ratio param
    struct SubParams {
        address market;
        uint256 price;
        uint8 state;
    }

    /// @dev checks current price of collateral in a LiquityV2 market and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseSubInputs(_subData);
        IAddressesRegistry market = IAddressesRegistry(triggerSubData.market);

        IPriceFeed priceFeed = IPriceFeed(market.priceFeed());
        (uint256 collPrice, ) = priceFeed.fetchPrice();
        uint256 currPrice = collPrice;

        if (PriceState(triggerSubData.state) == PriceState.OVER) {
            if (currPrice > triggerSubData.price) return true;
        }

        if (PriceState(triggerSubData.state) == PriceState.UNDER) {
            if (currPrice < triggerSubData.price) return true;
        }

        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override  returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool){
        return false;
    }
}
