// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface ICropper {
    function proxy(address) view external returns (address);
    function getOrCreateProxy(address) external returns (address);
    function join(address, address, uint256) external;
    function exit(address, address, uint256) external;
    function flee(address, address, uint256) external;
    function frob(bytes32, address, address, address, int256, int256) external;
    function quit(bytes32, address, address) external;
}
