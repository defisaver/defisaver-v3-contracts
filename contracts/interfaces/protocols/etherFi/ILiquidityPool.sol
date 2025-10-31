// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ILiquidityPool {
    /// @notice Deposit ETH into the pool, gets eETH tokens in return
    function deposit() external payable returns (uint256);
}
