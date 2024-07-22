// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IStakedToken {
    function getTotalRewardsBalance(address) external view returns (uint256);
}