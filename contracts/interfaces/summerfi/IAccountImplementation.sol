// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

interface IAccountImplementation {
    function execute(address _target, bytes memory _data) external payable returns (bytes32 response);

    function send(address _target, bytes memory _data) external payable;

    function owner() external view returns (address owner);

    function guard() external view returns (address);
}
