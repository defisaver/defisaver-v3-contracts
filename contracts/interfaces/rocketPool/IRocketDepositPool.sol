// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IRocketDepositPool {

    /// @notice Deposits ETH into Rocket Pool and mints the corresponding amount of rETH to the caller
    function deposit() external payable;
}
