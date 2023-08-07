// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../utils/helpers/UtilHelper.sol";
import "../actions/utils/helpers/ActionsUtilHelper.sol";
import "../DS/DSProxyFactoryInterface.sol";

/// @title Registry of proxies related to LSV
contract LSVProxyRegistry is AdminAuth, UtilHelper, ActionsUtilHelper {

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

    function getProxies(address _user) public view returns (address[] memory){
        address[] memory resultProxies = new address[](proxies[_user].length);
        for (uint256 i = 0; i < proxies[_user].length; i++){
            resultProxies[i] = proxies[_user][i];
        }
        return resultProxies;
    }

    /// @notice User calls from EOA if he wants to execute something with DSProxy bundled with build tx
    function addNewProxyAndExecute(address _target, bytes memory _data) public payable returns (address) {
        address newProxy = getFromPoolOrBuild(address(this));

        DSProxy(payable(newProxy)).execute{value: msg.value}(_target, _data);

        // if we didn't execute changeLSVProxyOwner in recipe
        if (DSAuth(newProxy).owner() == address(this)){
            DSAuth(newProxy).setOwner(msg.sender);
        }
        proxies[msg.sender].push(newProxy);

        emit NewProxy(msg.sender, newProxy);

        return newProxy;

    }

    function getProxyPoolCount() public view returns (uint256) {
        return proxyPool.length;
    }

    function removeProxy(uint256 _noInProxiesArr) public {
        uint256 arrLength = proxies[msg.sender].length;
        if (arrLength > 1 &&_noInProxiesArr < (arrLength - 1))  {
            proxies[msg.sender][_noInProxiesArr] = proxies[msg.sender][arrLength - 1];
        }
        proxies[msg.sender].pop();
    }

    function addProxy(address proxyAddr) public {
        proxies[msg.sender].push(proxyAddr);
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
            if (_user != (address(this))){
                DSAuth(newProxy).setOwner(_user);
            }

            return newProxy;
        } else {
            DSProxy newProxy = DSProxyFactoryInterface(PROXY_FACTORY_ADDR).build(_user);
            return address(newProxy);
        }
    }
    
}