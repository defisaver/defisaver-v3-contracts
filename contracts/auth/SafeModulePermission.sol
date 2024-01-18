// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/safe/ISafe.sol";

/// @title SafeModulePermission contract which works with Safe modules to give execute permission
contract SafeModulePermission {

    address public constant SENTINEL_MODULES = address(0x1);

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
    function disableLastModule(address _moduleAddr) public {
        ISafe(address(this)).disableModule(SENTINEL_MODULES, _moduleAddr);
    }
}
