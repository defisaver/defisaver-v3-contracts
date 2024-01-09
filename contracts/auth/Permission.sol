// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/safe/ISafe.sol";
import "./ModulePermission.sol";
import "./ProxyPermission.sol";
import "../utils/CheckWalletType.sol";

contract Permission is CheckWalletType, ProxyPermission, ModulePermission {

    // TODO: DONT HARDCODED IT HERE
    address internal constant PROXY_AUTH_ADDRESS = 0x149667b6FAe2c63D1B4317C716b0D0e4d3E2bD70;
    address internal constant MODULE_AUTH_ADDRESS = 0x64f5219563e28EeBAAd91Ca8D31fa3b36621FD4f; // NOT LIVE ADDR

    /// @dev Called from the context of the wallet we are using
    function giveWalletPermission() public {
        bool isDSProxy = isDSProxy(address(this));

        address authContract = isDSProxy ? PROXY_AUTH_ADDRESS : MODULE_AUTH_ADDRESS;

        isDSProxy ? giveProxyPermission(authContract) : enableModule(authContract);
    }
}