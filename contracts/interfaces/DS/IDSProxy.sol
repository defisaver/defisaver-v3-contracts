// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDSProxy {
    function execute(bytes memory _code, bytes memory _data) external payable returns (address, bytes32);

    function execute(address _target, bytes memory _data) external payable returns (bytes32);

    function setCache(address _cacheAddr) external payable returns (bool);

    function owner() external view returns (address);

    function guard() external view returns (address);
}
