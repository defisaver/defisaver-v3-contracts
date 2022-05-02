// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../auth/AdminAuth.sol";

contract QiDaoRegistry is AdminAuth {
    error VaultAlreadyRegistered(uint16);

    /// @notice IDs start from 1
    mapping(address => uint16) public vaultIdByVaultAddress;
    mapping(uint16 => address) public vaultAddressById;

    uint16 public latestVaultId = 0;
    // TODO: add only owner
    function addVault(address _vaultAddr) public returns (uint16 vaultId) {
        if (vaultIdByVaultAddress[_vaultAddr] != 0) revert VaultAlreadyRegistered(vaultIdByVaultAddress[_vaultAddr]);

        vaultId = ++latestVaultId;
        vaultIdByVaultAddress[_vaultAddr] = vaultId;
        vaultAddressById[vaultId] = _vaultAddr;
    }

    function removeVault(uint16 _vaultId) public {
        vaultIdByVaultAddress[vaultAddressById[_vaultId]] = 0;
        vaultAddressById[_vaultId] = address(0);
    }
}