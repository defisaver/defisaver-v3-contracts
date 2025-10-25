// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyFactory } from "../interfaces/DS/IDSProxyFactory.sol";
import { DSProxyFactoryHelper } from "./addresses/dsProxyFactory/DSProxyFactoryHelper.sol";

/// @title CheckWalletType - Helper contract to check if address represents DSProxy wallet or not
contract CheckWalletType is DSProxyFactoryHelper {
    function isDSProxy(address _proxy) public view returns (bool) {
        return IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_proxy);
    }
}
