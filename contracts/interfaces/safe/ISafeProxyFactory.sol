// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface ISafeProxyFactory {
    event ProxyCreation(address indexed proxy, address singleton);
    function createProxyWithNonce(address singleton, bytes memory initializer, uint256 saltNonce) external returns (address proxy);
    function proxyCreationCode() external pure returns (bytes memory);
}
