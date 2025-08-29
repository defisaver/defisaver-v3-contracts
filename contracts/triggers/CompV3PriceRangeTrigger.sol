// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IComet } from "../interfaces/compoundV3/IComet.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Trigger contract that verifies if current token price ratio is outside of given range specified during subscription
/// @notice This uses the CompoundV3 oracle, which returns the price of the collateral token in terms of the base (debt) token.
/// @notice The trigger expects the lowerPrice and upperPrice inputs to be scaled by 1e8.
/// @notice It is possible to check only one side of the range by setting the other side price to 0.
contract CompV3PriceRangeTrigger is ITrigger, AdminAuth {
    /// @param market address of the compoundV3 market
    /// @param collToken address of the collateral token from the market
    /// @param lowerPrice lower price of the collateral token in terms of the base token that represents the triggerable point.
    /// @param upperPrice upper price of the collateral token in terms of the base token that represents the triggerable point.
    struct SubParams {
        address market;
        address collToken;
        uint256 lowerPrice;
        uint256 upperPrice;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerData = parseSubInputs(_subData);

        address priceFeed = IComet(triggerData.market).getAssetInfoByAddress(triggerData.collToken).priceFeed;

        // This will return the price of the collateral token in terms of base token scaled by 1e8
        uint256 currPrice = IComet(triggerData.market).getPrice(priceFeed);

        // Only check lowerPrice if upperPrice is not set
        if (triggerData.upperPrice == 0) return currPrice < triggerData.lowerPrice;

        return currPrice < triggerData.lowerPrice || currPrice > triggerData.upperPrice;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _callData) public pure returns (SubParams memory params) {
        params = abi.decode(_callData, (SubParams));
    }
}
