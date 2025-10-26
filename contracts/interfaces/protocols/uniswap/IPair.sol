// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../token/IERC20.sol";

interface IPair is IERC20 {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint256);
    function price1CumulativeLast() external view returns (uint256);
    function kLast() external view returns (uint256);
}
