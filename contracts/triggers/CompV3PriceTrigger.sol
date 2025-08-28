// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IComet } from "../interfaces/compoundV3/IComet.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { TransientStorageCancun } from "../utils/TransientStorageCancun.sol";
import { CompV3RatioHelper } from "../actions/compoundV3/helpers/CompV3RatioHelper.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Trigger contract that verifies if current token price ratio is over/under the price ratio specified during subscription
/// @notice This uses the CompoundV3 oracle, which returns the price of the collateral token in terms of the base (debt) token.
/// @notice The trigger expects the price input to be scaled by 1e8.
/// @notice This trigger also uses the user address to temporarily store the current ratio of user's position.
contract CompV3PriceTrigger is
    ITrigger,
    AdminAuth,
    CompV3RatioHelper,
    TriggerHelper
{
    TransientStorageCancun public constant tempStorage = TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);

    enum PriceState {
        OVER,
        UNDER
    }

    /// @param market address of the compoundV3 market
    /// @param collToken address of the collateral token from the market
    /// @param user address of the user that will be used to store the current ratio for.
    /// @param price price of the collateral token in terms of the base token that represents the triggerable point. 
    /// @param state represents if we want the current price to be higher or lower than price param
    struct SubParams {
        address market;
        address collToken;
        address user;
        uint256 price;
        uint8 state;
    }

    function isTriggered(bytes memory, bytes memory _subData) public override returns (bool) {
        SubParams memory triggerData = parseSubInputs(_subData);

        uint256 currRatio = getSafetyRatio(triggerData.market, triggerData.user);
        tempStorage.setBytes32("COMP_RATIO", bytes32(currRatio));

        address priceFeed = IComet(triggerData.market).getAssetInfoByAddress(triggerData.collToken).priceFeed;

        // This will return the price of the collateral token in terms of base token scaled by 1e8
        uint256 currPrice = IComet(triggerData.market).getPrice(priceFeed);

        if (PriceState(triggerData.state) == PriceState.OVER) {
            if (currPrice > triggerData.price) return true;
        }

        if (PriceState(triggerData.state) == PriceState.UNDER) {
            if (currPrice < triggerData.price) return true;
        }

        return false;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}
    
    function isChangeable() public pure override returns (bool) { 
        return false;
    }

    function parseSubInputs(bytes memory _callData) public pure returns (SubParams memory params) {
        params = abi.decode(_callData, (SubParams));
    }
}
