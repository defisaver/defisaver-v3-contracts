// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

interface IPriceFeed {
    function lastGoodPrice() external pure returns (uint256);
}