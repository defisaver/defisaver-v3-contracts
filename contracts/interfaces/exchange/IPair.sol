// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../IERC20.sol";

abstract contract IPair is IERC20 {
    function token0() external view virtual returns (address);
    function token1() external view virtual returns (address);
    function getReserves() external view virtual returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view virtual returns (uint256);
    function price1CumulativeLast() external view virtual returns (uint256);
    function kLast() external view virtual returns (uint256);
}
