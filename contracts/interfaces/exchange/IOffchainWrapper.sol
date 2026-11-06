// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeData } from "../../exchangeV3/DFSExchangeData.sol";

/// @title IOffchainWrapper
/// @notice Shared interface for off-chain exchange wrapper contracts.
/// @dev Important security assumptions, which apply to every implementation:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
interface IOffchainWrapper {
    /// @notice Takes an order on the off-chain exchange and returns bool indicating if it is successful
    /// @dev Implementations must approve exactly `_exData.srcAmount` to `offchainData.allowanceTarget`,
    /// revoke that allowance before returning, and refund any leftover funds to the caller.
    /// @param _exData The exchange data
    /// @return success Whether the swap was successful
    /// @return tokensSwapped Amount of destination tokens received
    function takeOrder(DFSExchangeData.ExchangeData memory _exData)
        external
        payable
        returns (bool success, uint256 tokensSwapped);
}
