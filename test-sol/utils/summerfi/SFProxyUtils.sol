// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAccountGuard } from "../../../contracts/interfaces/protocols/summerfi/IAccountGuard.sol";
import { RegistryUtils } from "../RegistryUtils.sol";
import { Addresses } from "../Addresses.sol";

contract SFProxyUtils is RegistryUtils {
    function _whitelistAnyAddr(address _addr) internal {
        IAccountGuard accountGuard = IAccountGuard(Addresses.SF_PROXY_GUARD);
        address guardOwner = accountGuard.owner();

        cheats.prank(guardOwner);
        accountGuard.setWhitelist(_addr, true);

        assert(accountGuard.isWhitelisted(_addr));
    }

    function _whitelistSFProxyEntryPoint() internal {
        IAccountGuard accountGuard = IAccountGuard(Addresses.SF_PROXY_GUARD);
        address guardOwner = accountGuard.owner();

        address sfProxyEntryPoint = getAddr("SFProxyEntryPoint");

        cheats.prank(guardOwner);
        accountGuard.setWhitelist(sfProxyEntryPoint, true);

        assert(accountGuard.isWhitelisted(sfProxyEntryPoint));
    }
}
