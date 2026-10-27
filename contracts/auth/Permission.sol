// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SafeModulePermission } from "./SafeModulePermission.sol";
import { DSProxyPermission } from "./DSProxyPermission.sol";
import { DSAProxyPermission } from "./DSAProxyPermission.sol";
import { SFProxyPermission } from "./SFProxyPermission.sol";
import { DFSWalletPermission } from "./DFSWalletPermission.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title Permission contract to give execute permission on Smart Wallets
/// @dev Called from the context of the wallet
contract Permission is
    DSProxyPermission,
    SafeModulePermission,
    DSAProxyPermission,
    SFProxyPermission,
    DFSWalletPermission
{
    error UnsupportedWalletType(WalletType walletType);

    /// @notice Enables automation for DSProxy, Safe or DFSWallet.
    function _givePermissionToAuthContract(WalletType _walletType) internal {
        if (_walletType == WalletType.DSPROXY) {
            _giveProxyPermission(PROXY_AUTH_ADDRESS);
        } else if (_walletType == WalletType.SAFE) {
            _enableModule(MODULE_AUTH_ADDRESS);
        } else if (_walletType == WalletType.DFS) {
            _giveDFSWalletPermission(DFS_WALLET_AUTH_ADDRESS);
        } else {
            revert UnsupportedWalletType(_walletType);
        }
    }

    /// @notice Disables automation for DSProxy, Safe or DFSWallet.
    function _removePermissionFromAuthContract(WalletType _walletType) internal {
        if (_walletType == WalletType.DSPROXY) {
            _removeProxyPermission(PROXY_AUTH_ADDRESS);
        } else if (_walletType == WalletType.SAFE) {
            _disableModule(MODULE_AUTH_ADDRESS);
        } else if (_walletType == WalletType.DFS) {
            _removeDFSWalletPermission(DFS_WALLET_AUTH_ADDRESS);
        } else {
            revert UnsupportedWalletType(_walletType);
        }
    }

    /// @notice Gives permission to an arbitrary contract
    /// @dev Defaults to Safe Smart Wallet if wallet type is not found
    /// @param _walletType Type of smart wallet
    /// @param _to Address of the contract to give permission to
    function _givePermissionTo(WalletType _walletType, address _to) internal {
        if (_walletType == WalletType.DFS) {
            _giveDFSWalletPermission(_to);
        } else if (_walletType == WalletType.DSPROXY) {
            _giveProxyPermission(_to);
        } else if (_walletType == WalletType.DSAPROXY) {
            _giveDSAProxyPermission(_to);
        } else if (_walletType == WalletType.SFPROXY) {
            _giveSFProxyPermission(_to);
        } else {
            _enableModule(_to);
        }
    }

    /// @notice Removes permission for an arbitrary contract
    /// @dev Defaults to Safe Smart Wallet if wallet type is not found
    /// @param _walletType Type of smart wallet
    /// @param _from Address of the contract to remove permission from
    function _removePermissionFrom(WalletType _walletType, address _from) internal {
        if (_walletType == WalletType.DFS) {
            _removeDFSWalletPermission(_from);
        } else if (_walletType == WalletType.DSPROXY) {
            _removeProxyPermission(_from);
        } else if (_walletType == WalletType.DSAPROXY) {
            _removeDSAProxyPermission(_from);
        } else if (_walletType == WalletType.SFPROXY) {
            _removeSFProxyPermission(_from);
        } else {
            _disableModule(_from);
        }
    }
}
