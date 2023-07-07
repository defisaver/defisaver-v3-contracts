// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../utils/helpers/UtilHelper.sol";
import "../actions/utils/helpers/ActionsUtilHelper.sol";
import "../DS/DSProxyFactoryInterface.sol";

/// @title Checks Mcd registry and replaces the proxy addr if owner changed
contract LSVProxyRegistry is AdminAuth, UtilHelper, ActionsUtilHelper {

    /// @dev List of proxies a user owns
    mapping(address => address[]) public proxies;

    /// @dev List of prebuilt proxies the users can claim to save gas
    address[] public proxyPool;

    event NewProxy(address, address);
    event ChangedOwner(address oldOwner, address newOwner, address proxy);
    
    /// @notice User calls from EOA to build a new DFS registered proxy
    function addNewProxy() public returns (address) {
        address newProxy = getFromPoolOrBuild(msg.sender);
        proxies[msg.sender].push(newProxy);

        emit NewProxy(msg.sender, newProxy);

        return newProxy;
    }

    function getProxyPoolCount() public view returns (uint256) {
        return proxyPool.length;
    }
    
    /// @dev function to be called by proxy that will be changing owner
    function changeProxyOwner(address _oldOwner, address _newOwner, uint256 _noInProxiesArr) public {
        require (msg.sender == proxies[_oldOwner][_noInProxiesArr]);
        proxies[_oldOwner][_noInProxiesArr] = address(0);
        proxies[_newOwner].push(msg.sender);
        emit ChangedOwner(_oldOwner, _newOwner, msg.sender);
    }
    
    /// @dev let someone use this if they already changed proxy.owner on their own
    function changeProxiesInRegistry(address _newOwner, uint256 _noInProxiesArr) public {
        address proxyAddr = proxies[msg.sender][_noInProxiesArr];
        proxies[msg.sender][_noInProxiesArr] = address(0);
        proxies[_newOwner].push(proxyAddr);
        emit ChangedOwner(msg.sender, _newOwner, proxyAddr);
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
    
}