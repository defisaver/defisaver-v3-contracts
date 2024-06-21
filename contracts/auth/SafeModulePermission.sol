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
    function disableModule(address _moduleAddr) public {
        uint256 pageSize = 10;
        address startFrom = SENTINEL_MODULES;
        
        // returns up to 10 modules in order SM -> Mn -> M(n-1) -> ... -> M1 -> SM, without SM included
        (address[] memory modules,) = ISafe(address(this)).getModulesPaginated(startFrom, pageSize);

        for (uint256 i = 0; i < modules.length; ++i) {
            if (modules[i] == _moduleAddr) {
                // if this is the last module added, remove it with sentinel
                if (i == 0) {
                    ISafe(address(this)).disableModule(SENTINEL_MODULES, _moduleAddr);
                    return;
                }
                // there are at least 2 modules, remove it with previous module
                else {
                    ISafe(address(this)).disableModule(modules[i - 1], _moduleAddr);
                    return;
                }
            }
        }
        // if module not found, revert
        revert ModuleNotFoundError(_moduleAddr);
    }
}
