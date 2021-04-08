// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../IERC20.sol";

abstract contract IPair is IERC20 {
    function token0() external virtual view returns (address);
    function token1() external virtual view returns (address);
    function getReserves() external virtual view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external virtual view returns (uint);
    function price1CumulativeLast() external virtual view returns (uint);
    function kLast() external virtual view returns (uint);
}