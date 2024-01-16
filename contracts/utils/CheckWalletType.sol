// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/IDSProxyFactory.sol";
import "./helpers/UtilHelper.sol";

/// @title CheckWalletType - Helper contract to check if address belongs to DSProxy or not
contract CheckWalletType is UtilHelper {
    function isDSProxy(address _proxy) public view returns (bool) {
        return
            isAddressContract(_proxy) &&
            IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_proxy);
    }

    function isAddressContract(address addr) private view returns (bool) {
        bytes memory code = addr.code;
        return code.length > 0;
    }
}