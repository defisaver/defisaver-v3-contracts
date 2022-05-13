// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../auth/AdminAuth.sol";

/// @title Registry contract that matches Vault Addresses with IDs
/// @notice Used in QiDao Actions to save on calldata on L2
contract QiDaoRegistry is AdminAuth {
    error VaultAlreadyRegistered(uint16);
    error VaultIdNotRegistered(uint16);

    /// @notice IDs start from 1
    mapping(address => uint16) public vaultIdByVaultAddress;
    mapping(uint16 => address) public vaultAddressById;

    uint16 public latestVaultId = 0;

    function getVaultAddressById(uint16 id) public view returns (address vaultAddress) {
        vaultAddress = vaultAddressById[id];
        if (vaultAddress == address(0)) revert VaultIdNotRegistered(id);
    }

    /// @notice register a qiDao Vault address and receive the matching ID in return
    function addVault(address _vaultAddr) public onlyOwner returns (uint16 vaultId) {
        if (vaultIdByVaultAddress[_vaultAddr] != 0) revert VaultAlreadyRegistered(vaultIdByVaultAddress[_vaultAddr]);
        vaultId = registerVault(_vaultAddr);
    }

    /// @notice remove a qiDao Vault from the registry
    function removeVault(uint16 _vaultId) public onlyOwner {
        vaultIdByVaultAddress[vaultAddressById[_vaultId]] = 0;
        vaultAddressById[_vaultId] = address(0);
    }

    function registerVault(address _vaultAddr) internal returns (uint16 vaultId){
        vaultId = ++latestVaultId;
        vaultIdByVaultAddress[_vaultAddr] = vaultId;
        vaultAddressById[vaultId] = _vaultAddr;
    }
}