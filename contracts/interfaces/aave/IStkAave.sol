// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IStkAave {
  function cooldown() external virtual;
  function redeem(address to, uint256 amount) external virtual;
  function REWARD_TOKEN() external virtual view returns (address);
  function stake(address onBehalfOf, uint256 amount) external virtual;
  function claimRewards(address to, uint256 amount) external virtual;
  function STAKED_TOKEN() external virtual view returns (address);
  function setCooldownSeconds(uint256 newCooldown) external virtual;
  function getCooldownSeconds() external virtual view returns (uint256);
} 
