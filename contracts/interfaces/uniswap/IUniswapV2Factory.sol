// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view virtual returns (address pair);
    function allPairs(uint256) external view virtual returns (address pair);
    function allPairsLength() external view virtual returns (uint256);
    function feeTo() external view virtual returns (address);
    function feeToSetter() external view virtual returns (address);
}
