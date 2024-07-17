// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IFeeDistributor {
    function claim(address) external returns (uint256);
}