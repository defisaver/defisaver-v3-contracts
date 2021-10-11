// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IStakedToken {
    function getTotalRewardsBalance(address) external view returns (uint256);
}