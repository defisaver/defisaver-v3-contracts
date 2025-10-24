// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IMinter {
    function mint(address _gaugeAddr) external;
    function mint_many(address[8] memory _gaugeAddrs) external;
}
