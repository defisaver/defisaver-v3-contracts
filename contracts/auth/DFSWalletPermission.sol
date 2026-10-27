// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSWallet } from "../interfaces/dfsWallet/IDFSWallet.sol";
import { IDSAuthority } from "../interfaces/DS/IDSAuthority.sol";
import { IDSGuard } from "../interfaces/DS/IDSGuard.sol";
import { IDSGuardFactory } from "../interfaces/DS/IDSGuardFactory.sol";
import { AuthHelper } from "./helpers/AuthHelper.sol";

/// @title DFSWalletPermission - DSGuard permissions for the DFSWallet execution selector
contract DFSWalletPermission is AuthHelper {
    bytes4 private constant EXECUTE_SELECTOR = IDFSWallet.execute.selector;

    /// @notice Called in the context of DFSWallet to authorize an address
    /// @param _contractAddr Address which will be authorized
    function _giveDFSWalletPermission(address _contractAddr) internal {
        address currAuthority = address(IDFSWallet(address(this)).authority());
        IDSGuard guard = IDSGuard(currAuthority);

        if (currAuthority == address(0)) {
            guard = IDSGuardFactory(DSGUARD_FACTORY_ADDRESS).newGuard();
            IDFSWallet(address(this)).setAuthority(IDSAuthority(address(guard)));
        }

        if (!guard.canCall(_contractAddr, address(this), EXECUTE_SELECTOR)) {
            guard.permit(_contractAddr, address(this), EXECUTE_SELECTOR);
        }
    }

    /// @notice Called in the context of DFSWallet to remove authority of an address
    /// @param _contractAddr Auth address which will be removed from authority list
    function _removeDFSWalletPermission(address _contractAddr) internal {
        address currAuthority = address(IDFSWallet(address(this)).authority());

        // if there is no authority, that means that contract doesn't have permission
        if (currAuthority == address(0)) {
            return;
        }

        IDSGuard guard = IDSGuard(currAuthority);
        guard.forbid(_contractAddr, address(this), EXECUTE_SELECTOR);
    }
}
