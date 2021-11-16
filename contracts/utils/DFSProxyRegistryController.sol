// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./DFSProxyRegistry.sol";
import "../interfaces/IDSProxy.sol";
import "../DS/DSProxyFactoryInterface.sol";
import "./helpers/UtilHelper.sol";


/// @title User facing contract to manage new proxies (is owner of DFSProxyRegistry)
contract DFSProxyRegistryController is AdminAuth, UtilHelper {

    /// @dev List of prebuilt proxies the users can claim to save gas
    address[] public proxyPool;

    event NewProxy(address, address);
    event ChangedOwner(address, address);

    /// @notice User calls from EOA to build a new DFS registered proxy
    function addNewProxy() public returns (address) {
        address newProxy = getFromPoolOrBuild(msg.sender);
        DFSProxyRegistry(DFS_PROXY_REGISTRY_ADDR).addAdditionalProxy(msg.sender, newProxy);

        emit NewProxy(msg.sender, newProxy);

        return newProxy;
    }

    /// @notice Will change owner of proxy in DFSRegistry
    /// @dev Still need to .setOwner() in DSProxy first
    /// @dev msg.sender == DSProxy which calls this method
    function changeOwnerInDFSRegistry(address _newOwner) public {
        DFSProxyRegistry(DFS_PROXY_REGISTRY_ADDR).changeMcdOwner(_newOwner, msg.sender);

        emit ChangedOwner(_newOwner, msg.sender);
    }

    /// @notice Adds proxies to pool for users to later claim and save on gas
    function addToPool(uint256 _numNewProxies) public {
        for (uint256 i = 0; i < _numNewProxies; ++i) {
            DSProxy newProxy = DSProxyFactoryInterface(PROXY_FACTORY_ADDR).build();
            proxyPool.push(address(newProxy));
        }
    }

    /// @notice Created a new DSProxy or grabs a prebuilt one
    function getFromPoolOrBuild(address _user) internal returns (address) {
        if (proxyPool.length > 0) {
            address newProxy = proxyPool[proxyPool.length - 1];
            proxyPool.pop();

            DSAuth(newProxy).setOwner(_user);

            return newProxy;
        } else {
            DSProxy newProxy = DSProxyFactoryInterface(PROXY_FACTORY_ADDR).build(_user);
            return address(newProxy);
        }
    }

    function getProxies(address _user) public view returns (address[] memory) {
        (address mcdProxy, address[] memory additionalProxies) = DFSProxyRegistry(
            DFS_PROXY_REGISTRY_ADDR
        ).getAllProxies(_user);

        if (mcdProxy == address(0)) {
            return additionalProxies;
        }

        address[] memory proxies = new address[](additionalProxies.length + 1);
        proxies[0] = mcdProxy;

        if (additionalProxies.length == 0) {
            return proxies;
        }

        for (uint256 i = 0; i < additionalProxies.length; ++i) {
            proxies[i + 1] = additionalProxies[i];
        }

        return proxies;
    }

    function getProxyPoolCount() public view returns (uint256) {
        return proxyPool.length;
    }
}
