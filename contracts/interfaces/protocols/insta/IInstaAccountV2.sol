// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;
pragma abicoder v2;

interface IInstaAccountV2 {
    function cast(string[] memory, bytes[] memory, address) external;
}
