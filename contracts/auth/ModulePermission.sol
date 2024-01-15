// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/safe/ISafe.sol";

contract ModulePermission {

    address public constant SENTINEL_MODULES = address(0x1);

    // we assume we are in a context of a gnosis safe
    function enableModule(address _moduleAddr) public {
        /// @dev Can't enable the same module twice
        if(!ISafe(address(this)).isModuleEnabled(_moduleAddr)) {
            ISafe(address(this)).enableModule(_moduleAddr);
        }
    }

    function disableLastModule(address _moduleAddr) public {
        (address[] memory moduleArr, address next) = ISafe(address(this)).getModulesPaginated(SENTINEL_MODULES, 10);

        require(next == SENTINEL_MODULES, "Too many modules to handle");

        address prevAddr = SENTINEL_MODULES;

        ISafe(address(this)).disableModule(prevAddr, _moduleAddr);
    }
}