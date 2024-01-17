// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.10;

import {MarketParams, Market} from "./IMorphoBlue.sol";

/// @title IIrm
/// @author Morpho Labs
/// @custom:contact security@morpho.org
/// @notice Interface that Interest Rate Models (IRMs) used by Morpho must implement.
interface IIrm {
    /// @notice Returns the borrow rate of the market `marketParams`.
    /// @dev Assumes that `market` corresponds to `marketParams`.
    function borrowRate(MarketParams memory marketParams, Market memory market) external returns (uint256);

    /// @notice Returns the borrow rate of the market `marketParams` without modifying any storage.
    /// @dev Assumes that `market` corresponds to `marketParams`.
    function borrowRateView(MarketParams memory marketParams, Market memory market) external view returns (uint256);
}