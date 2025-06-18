// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

interface IBAMM {
    function deposit(uint256) external;
    function withdraw(uint256) external;
}