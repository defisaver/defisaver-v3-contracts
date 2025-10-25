// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IUniswapV3Factory {
    function getPool(address token0, address token1, uint24 fee) external view returns (address poolAddress);
}
