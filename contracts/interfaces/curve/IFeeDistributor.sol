// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

interface IFeeDistributor {
    function claim(address) external returns (uint256);
}