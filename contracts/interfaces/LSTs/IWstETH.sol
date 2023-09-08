// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IWstETH {
    function getStETHByWstETH(uint256 wstethAmount) external view returns(uint256 wethAmount);
    function getWstETHByStETH(uint256 wethAmount) external view returns(uint256 wstethAmount);
}