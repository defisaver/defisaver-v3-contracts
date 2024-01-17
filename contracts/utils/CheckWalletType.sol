// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/IDSProxyFactory.sol";
import "./helpers/UtilHelper.sol";

/// @title CheckWalletType - Helper contract to check if address belongs to DSProxy or not
contract CheckWalletType is UtilHelper {
    function isDSProxy(address _proxy) public view returns (bool) {
        return IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_proxy);
    }
}