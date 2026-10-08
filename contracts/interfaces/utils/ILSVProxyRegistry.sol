// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title LSVProxyRegistry interface
interface ILSVProxyRegistry {
    function proxies(address _user, uint256 _index) external view returns (address);
    function proxyPool(uint256 _index) external view returns (address);

    function addNewProxy() external returns (address);
    function updateRegistry(
        address _proxyAddr,
        address _oldOwner,
        uint256 _indexNumInOldOwnerProxiesArr
    ) external;
    function addToPool(uint256 _numNewProxies) external;

    function getProxies(address _user) external view returns (address[] memory);
    function getProxyPoolCount() external view returns (uint256);
}
