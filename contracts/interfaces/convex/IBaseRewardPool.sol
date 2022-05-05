// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity =0.8.10;

interface IBaseRewardPool {
    function extraRewardsLength() external view returns (uint256);
    function extraRewards(uint256) external view returns (address);

    function earned(address) external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    
    function getReward(address, bool) external returns (bool);
    function stakeFor(address, uint256) external;

    function withdraw(uint256, bool) external returns (bool);
    function withdrawAndUnwrap(uint256, bool) external returns (bool);
}