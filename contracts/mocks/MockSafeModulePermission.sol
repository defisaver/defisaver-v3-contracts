// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SafeModulePermission } from "../auth/SafeModulePermission.sol";

contract MockSafeModulePermission is SafeModulePermission {
    function enableModule(address _moduleAddr) public {
        super._enableModule(_moduleAddr);
    }

    function disableModule(address _moduleAddr) public {
        super._disableModule(_moduleAddr);
    }
}
