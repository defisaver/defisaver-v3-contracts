// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external virtual view returns (address pair);
    function allPairs(uint) external virtual view returns (address pair);
    function allPairsLength() external virtual view returns (uint);
    function feeTo() external virtual view returns (address);
    function feeToSetter() external virtual view returns (address);
}