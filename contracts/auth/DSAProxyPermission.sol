// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AuthHelper } from "./helpers/AuthHelper.sol";
import { IInstaAccount } from "../interfaces/protocols/insta/IInstaAccount.sol";

/// @title DSAProxyPermission contract which works with DSA proxy account to give/remove auth permission to a contract
contract DSAProxyPermission is AuthHelper {
    /// @notice Called in the context of DSA proxy account to authorize an address
    /// @param _contractAddr Address which will be authorized
    /// @dev Can't enable the same contract twice
    function _giveDSAProxyPermission(address _contractAddr) internal {
        if (!IInstaAccount(address(this)).isAuth(_contractAddr)) {
            IInstaAccount(address(this)).enable(_contractAddr);
        }
    }

    /// @notice Called in the context of DSA proxy account to remove authority of an address
    /// @param _contractAddr Auth address which will be removed from auth list
    /// @dev Can't remove a contract that is not authorized
    function _removeDSAProxyPermission(address _contractAddr) internal {
        if (IInstaAccount(address(this)).isAuth(_contractAddr)) {
            IInstaAccount(address(this)).disable(_contractAddr);
        }
    }
}
