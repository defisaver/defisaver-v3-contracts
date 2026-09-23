// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDiscount } from "../../interfaces/utils/IDiscount.sol";

/// @title DFSFeeLib
/// @notice Library for calculating the DFS fees
library DFSFeeLib {
    /// @dev 5 bps (0.05%) for automation fee
    /// @dev Fee is taken from destination token amount after sell and gas fee is taken
    uint256 public constant MAX_AUTOMATION_FEE_DIVIDER = 2000;

    /// @dev 25 bps (0.25%) for sell fee
    /// @dev Fee is taken from source token amount before sell
    uint256 public constant SELL_STANDARD_FEE_DIVIDER = 400;

    function calculateAutomationFee(uint256 _dfsFeeDivider, uint256 _availableAmount)
        internal
        pure
        returns (uint256 feeAmount)
    {
        // If divider is 0, no fee is taken.
        if (_dfsFeeDivider == 0) return 0;

        // If divider is lower the fee is greater, should be max 5 bps.
        if (_dfsFeeDivider < MAX_AUTOMATION_FEE_DIVIDER) {
            _dfsFeeDivider = MAX_AUTOMATION_FEE_DIVIDER;
        }

        feeAmount = _availableAmount / _dfsFeeDivider;
    }

    function calculateSellFee(
        uint256 _dfsFeeDivider,
        uint256 _availableAmount,
        IDiscount _discount,
        address _user
    ) internal view returns (uint256 feeAmount) {
        if (_dfsFeeDivider == 0 || _discount.serviceFeesDisabled(_user)) {
            return 0;
        }

        feeAmount = _availableAmount / _dfsFeeDivider;
    }
}
