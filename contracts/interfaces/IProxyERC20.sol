// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface IProxyERC20 {
    function target() external returns (address);
    function tokenState() external returns (address);
}