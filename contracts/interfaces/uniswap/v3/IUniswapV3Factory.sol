// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IUniswapV3Factory {
    function getPool(address token0, address token1, uint24 fee) external virtual view returns (address poolAddress);
}