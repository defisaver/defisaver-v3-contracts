// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IAccountFactory {
    function createAccount() external returns (address clone);

    function createAccount(address user) external returns (address);

    function guard() external view returns (address);

    function proxyTemplate() external view returns (address);

    function accountsGlobalCounter() external view returns (uint256);
}
