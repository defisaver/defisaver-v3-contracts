// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/safe/ISafe.sol";
import "./ModulePermission.sol";
import "./ProxyPermission.sol";
import "../utils/CheckWalletType.sol";

contract Permission is CheckWalletType, ProxyPermission, ModulePermission {   
    /// @dev Called from the context of the wallet we are using
    function giveWalletPermission() public {
        bool isDSProxy = isDSProxy(address(this));

        address authContract = isDSProxy ? PROXY_AUTH_ADDRESS : MODULE_AUTH_ADDRESS;

        isDSProxy ? giveProxyPermission(authContract) : enableModule(authContract);
    }
}