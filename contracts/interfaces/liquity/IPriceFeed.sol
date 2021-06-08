// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

interface IPriceFeed {
    function lastGoodPrice() external pure returns (uint256);
}