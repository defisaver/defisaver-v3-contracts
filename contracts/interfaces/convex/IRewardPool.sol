// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

interface IRewardPool {
    function rewardToken() external view returns (address);
    function earned(address) external view returns (uint256);
}