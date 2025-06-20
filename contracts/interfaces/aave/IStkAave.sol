// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IStkAave {
    function cooldown() external;
    function redeem(address to, uint256 amount) external;
    function REWARD_TOKEN() external view returns (address);
    function stake(address onBehalfOf, uint256 amount) external;
    function claimRewards(address to, uint256 amount) external;
    function STAKED_TOKEN() external view returns (address);
}
