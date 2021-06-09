// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../DS/DSMath.sol";
import "../../../DS/DSProxy.sol";
import "../../../interfaces/mcd/IManager.sol";
import "../../../interfaces/mcd/IJoin.sol";
import "../../../interfaces/mcd/IVat.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/mcd/ISpotter.sol";

/// @title Helper methods for Mcd ratio calc.
contract McdRatioHelper is DSMath {

    IVat public constant vat = IVat(0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B);
    ISpotter public constant spotter = ISpotter(0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3);
    IManager public constant manager = IManager(0x5ef30b9986345249bc32d8928B7ee64DE9435E39);

    /// @notice Gets CDP ratio
    /// @param _vaultId Id of the CDP
    /// @param _nextPrice Next price for user
    function getRatio(uint256 _vaultId, uint256 _nextPrice) public view returns (uint256) {
        bytes32 ilk = manager.ilks(_vaultId);
        uint256 price = (_nextPrice == 0) ? getPrice(ilk) : _nextPrice;

        (uint256 collateral, uint256 debt) = getCdpInfo(_vaultId, ilk);

        if (debt == 0) return 0;

        return rdiv(wmul(collateral, price), debt) / (10**18);
    }

    /// @notice Gets CDP info (collateral, debt)
    /// @param _vaultId Id of the CDP
    /// @param _ilk Ilk of the CDP
    function getCdpInfo(uint256 _vaultId, bytes32 _ilk) public view returns (uint256, uint256) {
        address urn = manager.urns(_vaultId);

        (uint256 collateral, uint256 debt) = vat.urns(_ilk, urn);
        (, uint256 rate, , , ) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }

    /// @notice Gets a price of the asset
    /// @param _ilk Ilk of the CDP
    function getPrice(bytes32 _ilk) public view returns (uint256) {
        (, uint256 mat) = spotter.ilks(_ilk);
        (, , uint256 spot, , ) = vat.ilks(_ilk);

        return rmul(rmul(spot, spotter.par()), mat);
    }
}