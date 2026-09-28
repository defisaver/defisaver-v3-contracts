// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxy } from "../../interfaces/DS/IDSProxy.sol";
import { IDSProxyFactory } from "../../interfaces/DS/IDSProxyFactory.sol";
import { IDSProxyRegistry } from "../../interfaces/DS/IDSProxyRegistry.sol";

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { UtilAddresses } from "../addresses/UtilAddresses.sol";
import { DSProxyFactoryHelper } from "../addresses/dsProxyFactory/DSProxyFactoryHelper.sol";

/// @title DFSProxyRegistryV2
/// @notice Registry of additional DSProxies related to a user
contract DFSProxyRegistryV2 is AdminAuth, UtilAddresses, DSProxyFactoryHelper {
    /*//////////////////////////////////////////////////////////////
                           CONSTANTS
    //////////////////////////////////////////////////////////////*/
    IDSProxyRegistry public constant MCD_REGISTRY = IDSProxyRegistry(MKR_PROXY_REGISTRY);

    /*//////////////////////////////////////////////////////////////
                            STORAGE
    //////////////////////////////////////////////////////////////*/
    /// @notice Registered additional proxies; entries may have stale ownership
    mapping(address user => address[] proxies) public additionalProxies;

    /// @notice One-based index in additionalProxies, or zero if absent
    mapping(address user => mapping(address proxy => uint256 indexPlusOne)) public
        additionalProxyIndex;

    /// @notice Last owner recorded by sync or restoration
    mapping(address proxy => address owner) public trackedOwner;

    /// @notice User or admin exclusions from additional-proxy registration for each user
    /// @dev Not cleared by ownership changes or sync, only by restoration.
    ///      Does not affect the primary Maker proxy
    mapping(address user => mapping(address proxy => bool removed)) public removedProxies;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/
    event ProxySynced(address indexed proxy, address indexed oldOwner, address indexed newOwner);
    event AdditionalProxyAdded(address indexed user, address indexed proxy);
    event AdditionalProxyRemoved(address indexed user, address indexed proxy);
    event ProxyExclusionUpdated(
        address indexed user, address indexed proxy, address indexed caller, bool excluded
    );

    /*//////////////////////////////////////////////////////////////
                            ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidDSProxy(address proxy);
    error SenderNotUserOrOwner(address sender, address user);

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyUserOrOwner(address _user) {
        if (msg.sender != _user && msg.sender != adminVault.owner()) {
            revert SenderNotUserOrOwner(msg.sender, _user);
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             PUBLIC
    //////////////////////////////////////////////////////////////*/
    /// @notice Returns the user's primary Maker proxy if factory-valid and still owned by the user
    /// @param _user The user to query
    /// @return proxy The primary Maker proxy, or zero if invalid or no longer owned by the user
    function getMcdProxy(address _user) public view returns (address proxy) {
        proxy = MCD_REGISTRY.proxies(_user);

        if (!_isValidDSProxy(proxy) || !_isDSProxyOwner(proxy, _user)) return address(0);
    }

    /// @notice Returns the primary Maker proxy and currently owned registered additional proxies
    /// @dev Additional proxies must have been synced or restored and not subsequently removed
    /// @param _user The user to query
    /// @return mcdProxy The primary Maker proxy, or zero if invalid or no longer owned
    /// @return validAdditionalProxies The currently owned registered additional proxies
    function getAllProxies(address _user)
        external
        view
        returns (address mcdProxy, address[] memory validAdditionalProxies)
    {
        mcdProxy = getMcdProxy(_user);

        address[] storage storedAdditionalProxies = additionalProxies[_user];
        uint256 length = storedAdditionalProxies.length;

        validAdditionalProxies = new address[](length);

        uint256 validProxyCount;
        for (uint256 i = 0; i < length; ++i) {
            address proxy = storedAdditionalProxies[i];

            if (_isValidAdditionalProxy(_user, proxy, mcdProxy)) {
                validAdditionalProxies[validProxyCount] = proxy;
                ++validProxyCount;
            }
        }

        assembly {
            mstore(validAdditionalProxies, validProxyCount)
        }
    }

    /// @notice Reconciles a DSProxy's tracked owner and additional-proxy registration. Permissionless.
    /// @param _proxy The DSProxy to reconcile
    function syncProxy(address _proxy) external {
        _syncProxy(_proxy);
    }

    /// @notice Reconciles multiple DSProxies' tracked owners and additional-proxy registrations. Permissionless.
    /// @dev Reverts the entire batch if any sync fails.
    /// @param _proxies The DSProxies to reconcile
    function syncProxies(address[] calldata _proxies) external {
        for (uint256 i = 0; i < _proxies.length; ++i) {
            _syncProxy(_proxies[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                         USER_OR_OWNER
    //////////////////////////////////////////////////////////////*/
    /// @notice Clears a user's exclusion and syncs the proxy
    /// @dev Also registers a previously unsynced proxy. The proxy is added only if the user
    ///      currently owns it and it is not the user's Maker proxy
    /// @param _user The user whose exclusion to clear
    /// @param _proxy The DSProxy to restore
    function restoreAdditionalProxy(address _user, address _proxy) external onlyUserOrOwner(_user) {
        delete removedProxies[_user][_proxy];
        emit ProxyExclusionUpdated(_user, _proxy, msg.sender, false);
        _syncProxy(_proxy);
    }

    /// @notice Removes and excludes a proxy from a user's additional proxies
    /// @dev This proxy can't be added as additional proxy for the user again, unless it is restored
    /// @param _user The user whose additional-proxy registration to exclude
    /// @param _proxy The proxy to remove and exclude
    function removeAdditionalProxy(address _user, address _proxy) external onlyUserOrOwner(_user) {
        removedProxies[_user][_proxy] = true;
        emit ProxyExclusionUpdated(_user, _proxy, msg.sender, true);
        _removeAdditionalProxy(_user, _proxy);
    }

    /// @notice Removes and excludes multiple proxies from a user's additional proxies
    /// @dev These proxies can't be added as additional proxies for the user again, unless they are restored
    /// @param _user The user whose additional-proxy registrations to exclude
    /// @param _proxies The proxies to remove and exclude
    function removeAdditionalProxies(address _user, address[] calldata _proxies)
        external
        onlyUserOrOwner(_user)
    {
        for (uint256 i = 0; i < _proxies.length; ++i) {
            address proxy = _proxies[i];
            removedProxies[_user][proxy] = true;
            emit ProxyExclusionUpdated(_user, proxy, msg.sender, true);
            _removeAdditionalProxy(_user, proxy);
        }
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL
    //////////////////////////////////////////////////////////////*/
    /// @dev Updates ownership tracking and registers eligible proxies
    function _syncProxy(address _proxy) internal {
        _requireValidDSProxy(_proxy);

        address oldOwner = trackedOwner[_proxy];
        address newOwner = IDSProxy(_proxy).owner();

        if (oldOwner != newOwner) {
            if (oldOwner != address(0)) {
                _removeAdditionalProxy(oldOwner, _proxy);
            }

            trackedOwner[_proxy] = newOwner;
        }

        // Additional proxy can only be added for non-zero owner, if it is:
        // - Not the current Maker proxy
        // - Not previously removed by admin or user itself
        if (
            newOwner != address(0) && !removedProxies[newOwner][_proxy]
                && MCD_REGISTRY.proxies(newOwner) != _proxy
        ) {
            _addAdditionalProxy(newOwner, _proxy);
        }

        if (oldOwner != newOwner) {
            emit ProxySynced(_proxy, oldOwner, newOwner);
        }
    }

    /// @dev Adds an entry if it is not already present
    function _addAdditionalProxy(address _user, address _proxy) internal {
        if (additionalProxyIndex[_user][_proxy] != 0) return;

        additionalProxies[_user].push(_proxy);
        additionalProxyIndex[_user][_proxy] = additionalProxies[_user].length;

        emit AdditionalProxyAdded(_user, _proxy);
    }

    /// @dev Removes an entry using swap-and-pop. Non existent entries are ignored
    function _removeAdditionalProxy(address _user, address _proxy) internal {
        uint256 indexPlusOne = additionalProxyIndex[_user][_proxy];
        if (indexPlusOne == 0) return;

        uint256 proxyIndex = indexPlusOne - 1;
        uint256 lastProxyIndex = additionalProxies[_user].length - 1;

        if (proxyIndex != lastProxyIndex) {
            address lastProxy = additionalProxies[_user][lastProxyIndex];
            additionalProxies[_user][proxyIndex] = lastProxy;
            additionalProxyIndex[_user][lastProxy] = indexPlusOne;
        }

        additionalProxies[_user].pop();
        delete additionalProxyIndex[_user][_proxy];

        emit AdditionalProxyRemoved(_user, _proxy);
    }

    /// @dev Reverts unless the address is a nonzero proxy registered by the configured DSProxy factory
    function _requireValidDSProxy(address _proxy) internal view {
        if (!_isValidDSProxy(_proxy)) revert InvalidDSProxy(_proxy);
    }

    /// @dev Checks if the additional proxy is still owned by the user and is not current Maker proxy
    function _isValidAdditionalProxy(address _user, address _proxy, address _mcdProxy)
        internal
        view
        returns (bool)
    {
        return _proxy != _mcdProxy && _isDSProxyOwner(_proxy, _user);
    }

    /// @dev Checks the proxy's current owner
    function _isDSProxyOwner(address _proxy, address _user) internal view returns (bool) {
        return IDSProxy(_proxy).owner() == _user;
    }

    /// @dev Checks for a nonzero proxy registered by the configured DSProxy factory
    function _isValidDSProxy(address _proxy) internal view returns (bool) {
        return _proxy != address(0) && IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_proxy);
    }
}
