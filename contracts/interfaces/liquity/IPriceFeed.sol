// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IPriceFeed {
    function lastGoodPrice() external pure returns (uint256);
    function fetchPrice() external returns (uint);
}