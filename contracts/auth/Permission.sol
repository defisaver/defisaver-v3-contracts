// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SafeModulePermission } from "./SafeModulePermission.sol";
import { DSProxyPermission } from "./DSProxyPermission.sol";
import { DSAProxyPermission } from "./DSAProxyPermission.sol";
import { SummerfiAccountPermission } from "./SummerfiAccountPermission.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title Permission contract to give execute permission on Smart Wallets
/// @dev Called from the context of the wallet
contract Permission is
    DSProxyPermission,
    SafeModulePermission,
    DSAProxyPermission,
    SummerfiAccountPermission
{
    /// @notice Gives permission to Auth contract used by dfs automation
    function _givePermissionToAuthContract(bool _isDSProxyWallet) internal {
        _isDSProxyWallet
            ? _giveProxyPermission(PROXY_AUTH_ADDRESS)
            : _enableModule(MODULE_AUTH_ADDRESS);
    }

    /// @notice Removes permission for Auth contract used by dfs automation
    function _removePermissionFromAuthContract(bool _isDSProxyWallet) internal {
        _isDSProxyWallet
            ? _removeProxyPermission(PROXY_AUTH_ADDRESS)
            : _disableModule(MODULE_AUTH_ADDRESS);
    }

    /// @notice Gives permission to an arbitrary contract
    /// @dev Defaults to Safe Smart Wallet if wallet type is not found
    /// @param _walletType Type of smart wallet
    /// @param _to Address of the contract to give permission to
    function _givePermissionTo(WalletType _walletType, address _to) internal {
        if (_walletType == WalletType.DSPROXY) {
            _giveProxyPermission(_to);
        } else if (_walletType == WalletType.DSAPROXY) {
            _giveDSAProxyPermission(_to);
        } else if (_walletType == WalletType.SUMMERFI) {
            _giveSummerfiAccountPermission(_to);
        } else {
            _enableModule(_to);
        }
    }

    /// @notice Removes permission for an arbitrary contract
    /// @dev Defaults to Safe Smart Wallet if wallet type is not found
    /// @param _walletType Type of smart wallet
    /// @param _from Address of the contract to remove permission from
    function _removePermissionFrom(WalletType _walletType, address _from) internal {
        if (_walletType == WalletType.DSPROXY) {
            _removeProxyPermission(_from);
        } else if (_walletType == WalletType.DSAPROXY) {
            _removeDSAProxyPermission(_from);
        } else if (_walletType == WalletType.SUMMERFI) {
            _removeSummerfiAccountPermission(_from);
        } else {
            _disableModule(_from);
        }
    }
}
