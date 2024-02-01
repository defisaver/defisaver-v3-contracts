// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./SafeModulePermission.sol";
import "./DSProxyPermission.sol";

/// @title Permission contract which works with Safe modules and DSProxy to give execute permission
contract Permission is DSProxyPermission, SafeModulePermission {   
    /// @dev Called from the context of the wallet we are using
    function giveWalletPermission(bool _isDSProxy) public {
        address authContract = _isDSProxy ? PROXY_AUTH_ADDRESS : MODULE_AUTH_ADDRESS;

        _isDSProxy ? giveProxyPermission(authContract) : enableModule(authContract);
    }
}