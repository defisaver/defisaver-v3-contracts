// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSAuthority } from "../interfaces/DS/IDSAuthority.sol";
import { IDSAuth } from "../interfaces/DS/IDSAuth.sol";
import { IDSGuard } from "../interfaces/DS/IDSGuard.sol";
import { IDSGuardFactory } from "../interfaces/DS/IDSGuardFactory.sol";
import { AuthHelper } from "./helpers/AuthHelper.sol";

/// @title DSProxyPermission Proxy contract which works with DSProxy to give execute permission
contract DSProxyPermission is AuthHelper {
    bytes4 public constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,bytes)"));

    /// @notice Called in the context of DSProxy to authorize an address
    /// @param _contractAddr Address which will be authorized
    function giveProxyPermission(address _contractAddr) public {
        address currAuthority = address(IDSAuth(address(this)).authority());
        IDSGuard guard = IDSGuard(currAuthority);

        if (currAuthority == address(0)) {
            guard = IDSGuardFactory(DSGUARD_FACTORY_ADDRESS).newGuard();
            IDSAuth(address(this)).setAuthority(IDSAuthority(address(guard)));
        }

        if (!guard.canCall(_contractAddr, address(this), EXECUTE_SELECTOR)) {
            guard.permit(_contractAddr, address(this), EXECUTE_SELECTOR);
        }
    }

    /// @notice Called in the context of DSProxy to remove authority of an address
    /// @param _contractAddr Auth address which will be removed from authority list
    function removeProxyPermission(address _contractAddr) public {
        address currAuthority = address(IDSAuth(address(this)).authority());

        // if there is no authority, that means that contract doesn't have permission
        if (currAuthority == address(0)) {
            return;
        }

        IDSGuard guard = IDSGuard(currAuthority);
        guard.forbid(_contractAddr, address(this), EXECUTE_SELECTOR);
    }
}
