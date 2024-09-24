// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IStakingRewards {
    function stake(uint256 amount, uint16 referral) external;
    function withdraw(uint256 amount) external;
    function getReward() external;
}