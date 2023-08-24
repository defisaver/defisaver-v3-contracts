// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract IStkAave {
  function cooldown() external virtual;
  function redeem(address to, uint256 amount) external virtual;
  function REWARD_TOKEN() external virtual view returns (address);
  function stake(address onBehalfOf, uint256 amount) external virtual;
  function claimRewards(address to, uint256 amount) external virtual;
} 
