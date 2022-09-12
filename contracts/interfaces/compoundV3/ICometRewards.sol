// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ICometRewards {
    struct RewardConfig {
        address token;
        uint64 rescaleFactor;
        bool shouldUpscale;
    }

    function rewardConfig(address) external virtual returns (RewardConfig memory);

    function claimTo(
        address comet,
        address src,
        address to,
        bool shouldAccrue
    ) external virtual;
}
