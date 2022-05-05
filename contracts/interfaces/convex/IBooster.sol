// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.8.10;

interface IBooster {
    struct PoolInfo {
        address lpToken;
        address token;
        address gauge;
        address crvRewards;
        address stash;
        bool shutdown;
    }

    function poolInfo(uint256) external view returns (PoolInfo memory);
    function deposit(uint256, uint256, bool) external returns (bool);
    function withdraw(uint256, uint256) external returns(bool);
}