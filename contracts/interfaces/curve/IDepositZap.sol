// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IDepositZap {
    function pool() external view returns (address);
    function curve() external view returns (address);
    function token() external view returns (address);
}