// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
import "../DS/DSMath.sol";

import "../interfaces/mcd/IManager.sol";
import "../interfaces/mcd/ISpotter.sol";
import "../interfaces/mcd/IVat.sol";

/// @title Getter contract for Vault info from Maker protocol
contract McdView is DSMath {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    address public constant SPOTTER_ADDRESS = 0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3;

    IManager public constant manager = IManager(MANAGER_ADDRESS);
    IVat public constant vat = IVat(VAT_ADDRESS);
    ISpotter public constant spotter = ISpotter(SPOTTER_ADDRESS);

    /// @notice Gets Vault info (collateral, debt)
    /// @param _vaultId Id of the Vault
    /// @param _ilk Ilk of the Vault
    function getVaultInfo(uint _vaultId, bytes32 _ilk) public view returns (uint, uint) {
        address urn = manager.urns(_vaultId);

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
    function getRatio(uint _vaultId) public view returns (uint) {
        bytes32 ilk = manager.ilks(_vaultId);
        uint price = getPrice(ilk);

        (uint collateral, uint debt) = getVaultInfo(_vaultId, ilk);

        if (debt == 0) return 0;

        return rdiv(wmul(collateral, price), debt) / (10 ** 18);
    }
}