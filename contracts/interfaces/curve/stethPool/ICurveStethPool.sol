// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface ICurveStethPool {
    function add_liquidity(uint256[2] memory, uint256) external payable returns (uint256);
    function remove_liquidity(uint256, uint256[2] memory) external returns (uint256[2] memory);
    function remove_liquidity_imbalance(uint256[2] memory, uint256) external returns (uint256);
}