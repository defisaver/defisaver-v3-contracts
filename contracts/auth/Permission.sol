// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SafeModulePermission } from "./SafeModulePermission.sol";
import { DSProxyPermission } from "./DSProxyPermission.sol";
import { DSAProxyPermission } from "./DSAProxyPermission.sol";
import { SummerfiPermission } from "./SummerfiPermission.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title Permission contract to give execute permission on Smart Wallets
/// @dev Called from the context of the wallet we are using
contract Permission is DSProxyPermission, SafeModulePermission, DSAProxyPermission, SummerfiPermission {
    function giveAuthContractPermission(WalletType _walletType) public {
        givePermissionTo(_walletType, _getAuthContractAddress(_walletType));
    }

    function removeAuthContractPermission(WalletType _walletType) public {
        removePermissionFrom(_walletType, _getAuthContractAddress(_walletType));
    }

    function givePermissionTo(WalletType _walletType, address _to) public {
        if (_walletType == WalletType.DSPROXY) {
            giveProxyPermission(_to);
        } else if (_walletType == WalletType.DSAPROXY) {
            giveDSAProxyPermission(_to);
        } else if (_walletType == WalletType.SUMMERFI) {
            giveSummerfiPermission(_to);
        } else {
            // Defaults to Safe
            enableModule(_to);
        }
    }

    function removePermissionFrom(WalletType _walletType, address _from) public {
        if (_walletType == WalletType.DSPROXY) {
            removeProxyPermission(_from);
        } else if (_walletType == WalletType.DSAPROXY) {
            removeDSAProxyPermission(_from);
        } else if (_walletType == WalletType.SUMMERFI) {
            removeSummerfiPermission(_from);
        } else {
            // Defaults to Safe
            disableModule(_from);
        }
    }

    function _getAuthContractAddress(WalletType _walletType) internal pure returns (address) {
        if (_walletType == WalletType.DSPROXY) return PROXY_AUTH_ADDRESS;
        if (_walletType == WalletType.DSAPROXY) return DSA_AUTH_ADDRESS;
        return MODULE_AUTH_ADDRESS;
    }
}