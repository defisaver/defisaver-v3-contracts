// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyRegistry } from "../DS/IDSProxyRegistry.sol";

/// @title DFSProxyRegistryV2 interface
interface IDFSProxyRegistryV2 {
    function MCD_REGISTRY() external view returns (IDSProxyRegistry);

    function additionalProxies(address _user, uint256 _index) external view returns (address);
    function additionalProxyIndex(address _user, address _proxy) external view returns (uint256);
    function trackedOwner(address _proxy) external view returns (address);
    function removedProxies(address _user, address _proxy) external view returns (bool);

    function getMcdProxy(address _user) external view returns (address);
    function getAllProxies(address _user)
        external
        view
        returns (address mcdProxy, address[] memory validAdditionalProxies);

    function syncProxy(address _proxy) external;
    function syncProxies(address[] calldata _proxies) external;

    function restoreAdditionalProxy(address _user, address _proxy) external;
    function removeAdditionalProxy(address _user, address _proxy) external;
    function removeAdditionalProxies(address _user, address[] calldata _proxies) external;
}
