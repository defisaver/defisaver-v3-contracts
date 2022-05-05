// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.10;

interface IGUniPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}