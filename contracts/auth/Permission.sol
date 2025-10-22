// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SafeModulePermission } from "./SafeModulePermission.sol";
import { DSProxyPermission } from "./DSProxyPermission.sol";
import { DSAProxyPermission } from "./DSAProxyPermission.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title Permission contract to give execute permission on Smart Wallets
/// @dev Called from the context of the wallet
contract Permission is DSProxyPermission, SafeModulePermission, DSAProxyPermission {

    /// @notice Gives permission to Auth contract used by dfs automation
    function _giveAuthContractPermission(WalletType _walletType) internal {
        _givePermissionTo(_walletType, _getAuthContractAddress(_walletType));
    }

    /// @notice Removes permission for Auth contract used by dfs automation
    function _removeAuthContractPermission(WalletType _walletType) internal {
        _removePermissionFrom(_walletType, _getAuthContractAddress(_walletType));
    }

    /// @notice Gives permission to an arbitrary contract
    /// @dev Defaults to Safe Smart Wallet if wallet type is not found
    /// @param _walletType Type of smart wallet
    /// @param _to Address of the contract to give permission to
    function _givePermissionTo(WalletType _walletType, address _to) internal {
        if (_walletType == WalletType.DSPROXY) {
            giveProxyPermission(_to);
        } else if (_walletType == WalletType.DSAPROXY) {
            giveDSAProxyPermission(_to);
        } else {
            enableModule(_to);
        }
    }

    /// @notice Removes permission for an arbitrary contract
    /// @dev Defaults to Safe Smart Wallet if wallet type is not found
    /// @param _walletType Type of smart wallet
    /// @param _from Address of the contract to remove permission from
    function _removePermissionFrom(WalletType _walletType, address _from) internal {
        if (_walletType == WalletType.DSPROXY) {
            removeProxyPermission(_from);
        } else if (_walletType == WalletType.DSAPROXY) {
            removeDSAProxyPermission(_from);
        } else {
            disableModule(_from);
        }
    }

    /// @notice Returns the Auth contract address for a given wallet type
    /// @dev Defaults to Safe Smart Wallet
    function _getAuthContractAddress(WalletType _walletType) internal pure returns (address) {
        if (_walletType == WalletType.DSPROXY) return PROXY_AUTH_ADDRESS;
        if (_walletType == WalletType.DSAPROXY) return DSA_AUTH_ADDRESS;
        return MODULE_AUTH_ADDRESS;
    }
}