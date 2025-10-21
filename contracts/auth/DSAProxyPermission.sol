// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {AuthHelper} from "./helpers/AuthHelper.sol";
import {IInstaAccountV2} from "../interfaces/insta/IInstaAccountV2.sol";

/// @title DSAProxyPermission contract which works with DSA proxy account to give/remove auth permission to a contract
contract DSAProxyPermission is AuthHelper {

    /// @notice Called in the context of DSA proxy account to authorize an address
    /// @param _contractAddr Address which will be authorized
    /// @dev Can't enable the same contract twice
    function giveDSAProxyPermission(address _contractAddr) public {
        if (!IInstaAccountV2(address(this)).isAuth(_contractAddr)) {
            IInstaAccountV2(address(this)).enable(_contractAddr);
        }
    }

    /// @notice Called in the context of DSA proxy account to remove authority of an address
    /// @param _contractAddr Auth address which will be removed from auth list
    /// @dev Can't remove a contract that is not authorized
    function removeDSAProxyPermission(address _contractAddr) public {
        if (IInstaAccountV2(address(this)).isAuth(_contractAddr)) {
            IInstaAccountV2(address(this)).disable(_contractAddr);
        }
    }
}