// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IUmbrellaRewardsController {

    function claimSelectedRewards(
        address asset,
        address[] calldata rewards,
        address receiver
    ) external returns (uint256[] memory);
}