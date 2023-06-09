// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/IProxyRegistry.sol";
import "../interfaces/IDSProxy.sol";
import "./helpers/UtilHelper.sol";
import "../core/DFSRegistry.sol";
import "../actions/utils/helpers/ActionsUtilHelper.sol";

/// @title Checks Mcd registry and replaces the proxy addr if owner changed
contract DFSProxyRegistry is AdminAuth, UtilHelper, ActionsUtilHelper {

    IProxyRegistry public mcdRegistry = IProxyRegistry(MKR_PROXY_REGISTRY);
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 public DFS_PROXY_REGISTRY_CONTROLLER_ID = 0xcbbb53f2;

    mapping(address => address) public changedOwners;
    mapping(address => address[]) public additionalProxies;

    /// @notice Changes the proxy that is returned for the user
    /// @dev Used when the user changed DSProxy ownership himself
    function changeMcdOwner(address _user, address _proxy) public {
        address dfsProxyRegistryController = registry.getAddr(DFS_PROXY_REGISTRY_CONTROLLER_ID);
        require(msg.sender == dfsProxyRegistryController);
        
        if (IDSProxy(_proxy).owner() == _user) {
            changedOwners[_user] = _proxy;
        }
    }

    /// @notice Returns the proxy address associated with the user account
    /// @dev If user changed ownership of DSProxy admin can hardcode replacement
    function getMcdProxy(address _user) public view returns (address) {
        address proxyAddr = mcdRegistry.proxies(_user);

        // if check changed proxies
        if (changedOwners[_user] != address(0)) {
            return changedOwners[_user];
        }

        return proxyAddr;
    }

    function addAdditionalProxy(address _user, address _proxy) public {
        address dfsProxyRegistryController = registry.getAddr(DFS_PROXY_REGISTRY_CONTROLLER_ID);
        require(msg.sender == dfsProxyRegistryController);

        if (IDSProxy(_proxy).owner() == _user) {
            additionalProxies[_user].push(_proxy);
        }
    }
			
    function getAllProxies(address _user) public view returns (address, address[] memory) {
        return (getMcdProxy(_user), additionalProxies[_user]);
    }
}