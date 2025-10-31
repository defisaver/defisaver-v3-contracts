// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Permission } from "../auth/Permission.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract MockPermission is Permission {
    function givePermissionToAuthContract(bool _isDSProxyWallet) public {
        super._givePermissionToAuthContract(_isDSProxyWallet);
    }

    function removePermissionFromAuthContract(bool _isDSProxyWallet) public {
        super._removePermissionFromAuthContract(_isDSProxyWallet);
    }

    function givePermissionTo(WalletType _walletType, address _to) public {
        super._givePermissionTo(_walletType, _to);
    }

    function removePermissionFrom(WalletType _walletType, address _from) public {
        super._removePermissionFrom(_walletType, _from);
    }
}
