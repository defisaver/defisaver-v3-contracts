// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title IExchangeV3
/// @notice Shared interface for on-chain exchange wrapper contracts.
/// @dev Important security assumptions, which apply to every implementation:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. On-chain wrappers are primarily used for simulations and testing.
/// 3. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
interface IExchangeV3 {
    /// @notice Sells `_srcAmount` of `_srcAddr` for `_destAddr` and returns the amount received
    /// @dev Implementations must approve exactly `_srcAmount` to the router, revoke that allowance
    /// after the swap and forward any unused source tokens to the caller.
    /// Slippage is checked in DFSExchangeCore instead of in the wrapper.
    /// @param _srcAddr The token to sell
    /// @param _destAddr The token to buy
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData Exchange specific route and swap params
    /// @return amountOut Amount of destination tokens received
    function sell(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        bytes memory _additionalData
    ) external returns (uint256 amountOut);

    /// @notice Returns the rate for which `_srcAmount` of `_srcAddr` can be sold for `_destAddr`
    /// @param _srcAddr The token to sell
    /// @param _destAddr The token to buy
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData Exchange specific route and swap params
    /// @return rate The sell rate
    function getSellRate(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        bytes memory _additionalData
    ) external returns (uint256 rate);
}
