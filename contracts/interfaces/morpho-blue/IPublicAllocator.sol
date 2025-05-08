
// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Id, MarketParams } from "./IMorphoBlue.sol";

struct FlowCaps {
    /// @notice The maximum allowed inflow in a market.
    uint128 maxIn;
    /// @notice The maximum allowed outflow in a market.
    uint128 maxOut;
}

struct Withdrawal {
    /// @notice The market from which to withdraw.
    MarketParams marketParams;
    /// @notice The amount to withdraw.
    uint128 amount;
}

/// @author Morpho Labs
/// @custom:contact security@morpho.org
/// @dev Use this interface for PublicAllocator to have access to all the functions with the appropriate function
/// signatures.
interface IPublicAllocator {
    /// @notice The admin for a given vault.
    function admin(address vault) external view returns (address);

    /// @notice The current ETH fee for a given vault.
    function fee(address vault) external view returns (uint256);

    /// @notice The accrued ETH fee for a given vault.
    function accruedFee(address vault) external view returns (uint256);

    /// @notice Returns the maximum inflow and maximum outflow through public allocation of a given market for a given
    /// vault.
    function flowCaps(address vault, Id) external view returns (FlowCaps memory);

    /// @notice Reallocates from a list of markets to one market.
    /// @param vault The MetaMorpho vault to reallocate.
    /// @param withdrawals The markets to withdraw from,and the amounts to withdraw.
    /// @param supplyMarketParams The market receiving total withdrawn to.
    /// @dev Will call MetaMorpho's `reallocate`.
    /// @dev Checks that the flow caps are respected.
    /// @dev Will revert when `withdrawals` contains a duplicate or is not sorted.
    /// @dev Will revert if `withdrawals` contains the supply market.
    /// @dev Will revert if a withdrawal amount is larger than available liquidity.
    function reallocateTo(address vault, Withdrawal[] calldata withdrawals, MarketParams calldata supplyMarketParams)
        external
        payable;
}