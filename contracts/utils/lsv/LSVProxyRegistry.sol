// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { UtilAddresses } from "../../utils/addresses/UtilAddresses.sol";
import { ActionsUtilHelper } from "../../actions/utils/helpers/ActionsUtilHelper.sol";
import { IDSProxyFactory } from "../../interfaces/DS/IDSProxyFactory.sol";
import {
    DSProxyFactoryHelper
} from "../../utils/addresses/dsProxyFactory/DSProxyFactoryHelper.sol";
import { IDSProxy } from "../../interfaces/DS/IDSProxy.sol";
import { IDSAuth } from "../../interfaces/DS/IDSAuth.sol";

/// @title Registry of proxies related to LSV
contract LSVProxyRegistry is AdminAuth, UtilAddresses, ActionsUtilHelper, DSProxyFactoryHelper {
    /// @dev List of proxies a user owns
    mapping(address => address[]) public proxies;

    /// @dev List of prebuilt proxies the users can claim to save gas
    address[] public proxyPool;

    event NewProxy(address, address);
    event ChangedOwner(address oldOwner, address newOwner, address proxy);

    /// @notice User calls from EOA to build a new LSV registered proxy
    function addNewProxy() public returns (address) {
        address newProxy = getFromPoolOrBuild(msg.sender);
        proxies[msg.sender].push(newProxy);

        emit NewProxy(msg.sender, newProxy);

        return newProxy;
    }

    function updateRegistry(
        address _proxyAddr,
        address _oldOwner,
        uint256 _indexNumInOldOwnerProxiesArr
    ) public {
        // check if msg.sender is the owner of proxy in question
        require(IDSProxy(_proxyAddr).owner() == msg.sender);

        // check if oldOwner really was the owner of proxy in question
        require(proxies[_oldOwner][_indexNumInOldOwnerProxiesArr] == _proxyAddr);

        // remove proxy from oldOwners proxies
        uint256 oldOwnersProxyCount = proxies[_oldOwner].length;
        if (oldOwnersProxyCount > 1 && _indexNumInOldOwnerProxiesArr < (oldOwnersProxyCount - 1)) {
            proxies[_oldOwner][_indexNumInOldOwnerProxiesArr] =
                proxies[_oldOwner][oldOwnersProxyCount - 1];
        }
        proxies[_oldOwner].pop();

        // add proxy to msg.sender proxies
        proxies[msg.sender].push(_proxyAddr);
    }

    /// @notice Adds proxies to pool for users to later claim and save on gas
    function addToPool(uint256 _numNewProxies) public {
        for (uint256 i = 0; i < _numNewProxies; ++i) {
            IDSProxy newProxy = IDSProxyFactory(PROXY_FACTORY_ADDR).build();
            proxyPool.push(address(newProxy));
        }
    }

    /// @notice helper function to get all users proxies
    function getProxies(address _user) public view returns (address[] memory) {
        address[] memory resultProxies = new address[](proxies[_user].length);
        for (uint256 i = 0; i < proxies[_user].length; i++) {
            resultProxies[i] = proxies[_user][i];
        }
        return resultProxies;
    }

    /// @notice helper function to check how many proxies are there in the proxy pool for cheaper user onboarding
    function getProxyPoolCount() public view returns (uint256) {
        return proxyPool.length;
    }

    /// @notice Create a new DSProxy or grabs a prebuilt one
    function getFromPoolOrBuild(address _user) internal returns (address) {
        if (proxyPool.length > 0) {
            address newProxy = proxyPool[proxyPool.length - 1];
            proxyPool.pop();

            IDSAuth(newProxy).setOwner(_user);
            return newProxy;
        } else {
            IDSProxy newProxy = IDSProxyFactory(PROXY_FACTORY_ADDR).build(_user);
            return address(newProxy);
        }
    }
}
