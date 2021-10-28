// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

interface IFeeDistributor {
    function claim(address) external returns (uint256);
}