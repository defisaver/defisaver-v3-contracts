// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ICometRewards {
    struct RewardConfig {
        address token;
        uint64 rescaleFactor;
        bool shouldUpscale;
    }
    struct RewardOwed {
        address token;
        uint owed;
    }

    function rewardConfig(address) external virtual returns (RewardConfig memory);

    function claimTo(
        address comet,
        address src,
        address to,
        bool shouldAccrue
    ) external virtual;

    function rewardsClaimed(address _market, address _user) external virtual view returns (uint256);
    function getRewardOwed(address _market, address _user) external virtual returns (RewardOwed memory);
}
