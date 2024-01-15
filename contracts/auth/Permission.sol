// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/safe/ISafe.sol";
import "./ModulePermission.sol";
import "./ProxyPermission.sol";
import "../utils/CheckWalletType.sol";

contract Permission is CheckWalletType, ProxyPermission, ModulePermission {

    // TODO: DONT HARDCODED IT HERE
    address internal constant PROXY_AUTH_ADDRESS = 0x149667b6FAe2c63D1B4317C716b0D0e4d3E2bD70;
    address internal constant MODULE_AUTH_ADDRESS = 0x840748F7Fd3EA956E5f4c88001da5CC1ABCBc038; // NOT LIVE ADDR

    /// @dev Called from the context of the wallet we are using
    function giveWalletPermission() public {
        bool isDSProxy = isDSProxy(address(this));

        address authContract = isDSProxy ? PROXY_AUTH_ADDRESS : MODULE_AUTH_ADDRESS;

        isDSProxy ? giveProxyPermission(authContract) : enableModule(authContract);
    }
}