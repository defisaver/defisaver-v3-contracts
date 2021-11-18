// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.7.6;

interface IGUniPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getUnderlyingBalances()
        external
        view
        returns (uint256 amount0Current, uint256 amount1Current);
    function totalSupply() external view returns (uint256);
}