// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IStakedToken {
    function getTotalRewardsBalance(address) external view returns (uint256);
}