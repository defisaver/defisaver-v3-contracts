// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface ISafeProxyFactory {
    function proxyCreationCode() external pure returns (bytes memory);

    function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) external returns (address proxy);
    
}