// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ICometRewards {
    struct RewardConfig {
        address token;
        uint64 rescaleFactor;
        bool shouldUpscale;
    }

    struct RewardOwed {
        address token;
        uint256 owed;
    }

    function rewardConfig(address) external returns (RewardConfig memory);

    function claimTo(address comet, address src, address to, bool shouldAccrue) external;

    function rewardsClaimed(address _market, address _user) external view returns (uint256);
    function getRewardOwed(address _market, address _user) external returns (RewardOwed memory);
}
