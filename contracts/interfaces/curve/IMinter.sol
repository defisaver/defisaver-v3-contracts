// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

interface IMinter {
    function mint(address _gaugeAddr) external;
    function mint_many(address[8] memory _gaugeAddrs) external;
}