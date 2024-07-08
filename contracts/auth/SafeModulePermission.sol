// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISafe } from "../interfaces/safe/ISafe.sol";

/// @title SafeModulePermission contract which works with Safe modules to give execute permission
contract SafeModulePermission {

    address public constant SENTINEL_MODULES = address(0x1);

    error ModuleNotFoundError(address moduleAddr);

    /// @notice Called in the context of Safe to authorize module
    /// @param _moduleAddr Address of module which will be authorized
    /// @dev Can't enable the same module twice
    function enableModule(address _moduleAddr) public {
        if(!ISafe(address(this)).isModuleEnabled(_moduleAddr)) {
            ISafe(address(this)).enableModule(_moduleAddr);
        }
    }

    /// @notice Called in the context of Safe to remove authority of module
    /// @param _moduleAddr Address of module which will be removed from authority list
    /// @dev moduleAddr has to be one of the last 10 modules added
    /// @dev modules are returned in order SM -> Mn -> M(n-1) -> ... -> M1 -> SM, without SM included
    function disableModule(address _moduleAddr) public {
        address startFrom = SENTINEL_MODULES;

        // to save on gas, first check for last 2 modules added as they are most likely to be the ones to be removed
        (address[] memory modules,) = ISafe(address(this)).getModulesPaginated(startFrom, 2);

        // if no modules found, revert
        if (modules.length == 0) {
            revert ModuleNotFoundError(_moduleAddr);
        }

        // check for last module added
        if (modules[0] == _moduleAddr) {
            ISafe(address(this)).disableModule(SENTINEL_MODULES, _moduleAddr);
            return;
        }

        // if there is only 1 module and it is not the one to be removed, revert
        if (modules.length == 1) {
            revert ModuleNotFoundError(_moduleAddr);
        }

        // check for second last module added
        if (modules[1] == _moduleAddr) {
            ISafe(address(this)).disableModule(modules[0], _moduleAddr);
            return;
        }

        // if module not found in last 2 modules, fetch up to 8 more modules. Start searching from the second last module
        startFrom = modules[1];
        (modules,) = ISafe(address(this)).getModulesPaginated(startFrom, 8);

        if (modules.length > 0) {
            if (modules[0] == _moduleAddr) {
                ISafe(address(this)).disableModule(startFrom, _moduleAddr);
                return;
            }
            for (uint256 i = 1; i < modules.length; ++i) {
                if (modules[i] == _moduleAddr) {
                    ISafe(address(this)).disableModule(modules[i - 1], _moduleAddr);
                    return;
                }
            }
        }
        // if module not found, revert
        revert ModuleNotFoundError(_moduleAddr);
    }
}
