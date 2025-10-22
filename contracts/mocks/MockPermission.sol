// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Permission } from "../auth/Permission.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract MockPermission is Permission {
    function giveAuthContractPermission(WalletType _walletType) public {
        super._giveAuthContractPermission(_walletType);
    }

    function removeAuthContractPermission(WalletType _walletType) public {
        super._removeAuthContractPermission(_walletType);
    }

    function givePermissionTo(WalletType _walletType, address _to) public {
        super._givePermissionTo(_walletType, _to);
    }

    function removePermissionFrom(WalletType _walletType, address _from) public {
        super._removePermissionFrom(_walletType, _from);
    }
}
