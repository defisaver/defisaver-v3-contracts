// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../DS/DSMath.sol";

import "../actions/mcd/helpers/McdHelper.sol";
import "../interfaces/mcd/IManager.sol";
import "../interfaces/mcd/ICropper.sol";
import "../interfaces/mcd/ISpotter.sol";
import "../interfaces/mcd/IVat.sol";

/// @title Getter contract for Vault info from Maker protocol
contract McdView is DSMath, McdHelper {
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    ISpotter public constant spotter = ISpotter(SPOTTER_ADDRESS);

    /// @notice Gets Vault info (collateral, debt)
    /// @param _managerAddr Address of the McdManger or Cropper contract
    /// @param _vaultId Id of the Vaults
    /// @param _ilk Ilk of the Vault
    function getVaultInfo(address _managerAddr, uint _vaultId, bytes32 _ilk) public view returns (uint, uint) {
        address urn;
        if (_managerAddr == CROPPER) {
            address owner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
            urn = ICropper(CROPPER).proxy(owner);
        } else {
            urn = IManager(_managerAddr).urns(_vaultId);
        }

        (uint collateral, uint debt) = vat.urns(_ilk, urn);
        (,uint rate,,,) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }

    /// @notice Gets a price of the asset
    /// @param _ilk Ilk of the Vault
    function getPrice(bytes32 _ilk) public view returns (uint) {
        (, uint mat) = spotter.ilks(_ilk);
        (,,uint spot,,) = vat.ilks(_ilk);

        return rmul(rmul(spot, spotter.par()), mat);
    }

    /// @notice Gets Vaults ratio
    /// @param _vaultId Id of the Vault
    function getRatio(address _managerAddr, uint _vaultId) public view returns (uint) {
        bytes32 ilk;

        if (_managerAddr == CROPPER) {
            ilk = ICdpRegistry(CDP_REGISTRY).ilks(_vaultId);
        } else {
            ilk = IManager(_managerAddr).ilks(_vaultId);
        }

        uint price = getPrice(ilk);

        (uint collateral, uint debt) = getVaultInfo(_managerAddr, _vaultId, ilk);

        if (debt == 0) return 0;

        return rdiv(wmul(collateral, price), debt) / (10 ** 18);
    }
}