// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAaveV4Oracle } from "../interfaces/protocols/aaveV4/IAaveV4Oracle.sol";
import { ISpoke } from "../interfaces/protocols/aaveV4/ISpoke.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title AaveV4QuotePriceRangeTrigger
/// @notice Verifies if current token price ratio for aaveV4 spoke is outside of subbed price range.
/// @notice It is possible to check only one side of the range by setting the other side price to 0.
/// @dev The trigger expects the lowerPrice and upperPrice inputs to be scaled by PRICE_SCALE.
contract AaveV4QuotePriceRangeTrigger is ITrigger, AdminAuth, TriggerHelper {
    /// @dev Expected subbed price scale.
    uint256 public constant PRICE_SCALE = 1e8;

    /// @param spoke Address of the spoke.
    /// @param baseTokenId Reserve id of the base token which is quoted.
    /// @param quoteTokenId Reserve id of the quote token.
    /// @param lowerPrice Lower price of the base token in terms of the quote token that represents the triggerable point.
    /// @param upperPrice Upper price of the base token in terms of the quote token that represents the triggerable point.
    struct SubParams {
        address spoke;
        uint256 baseTokenId;
        uint256 quoteTokenId;
        uint256 lowerPrice;
        uint256 upperPrice;
    }

    /// @notice Function that determines whether to trigger based on current token price ratio for aaveV4 spoke.
    /// @param _subData Encoded subscription data.
    /// @return triggered Whether to trigger or not.
    function isTriggered(bytes memory, bytes memory _subData)
        public
        view
        override
        returns (bool triggered)
    {
        SubParams memory sub = parseSubInputs(_subData);
        uint256 currPrice = getPrice(sub.spoke, sub.baseTokenId, sub.quoteTokenId);

        // Only check lowerPrice if upperPrice is not set.
        if (sub.upperPrice == 0) return currPrice < sub.lowerPrice;

        triggered = currPrice < sub.lowerPrice || currPrice > sub.upperPrice;
    }

    /// @notice Function that returns current token price ratio for aaveV4 spoke.
    /// @param _spoke Address of the spoke.
    /// @param _baseTokenId Reserve id of the base token which is quoted.
    /// @param _quoteTokenId Reserve id of the quote token.
    /// @return price Current token price ratio for aaveV4 spoke.
    function getPrice(address _spoke, uint256 _baseTokenId, uint256 _quoteTokenId)
        public
        view
        returns (uint256 price)
    {
        IAaveV4Oracle oracle = IAaveV4Oracle(ISpoke(_spoke).ORACLE());

        uint256[] memory reserveIds = new uint256[](2);
        reserveIds[0] = _baseTokenId;
        reserveIds[1] = _quoteTokenId;
        uint256[] memory prices = oracle.getReservesPrices(reserveIds);

        price = prices[0] * PRICE_SCALE / prices[1];
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _callData) public pure returns (SubParams memory params) {
        params = abi.decode(_callData, (SubParams));
    }
}
