// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
import "../DS/DSMath.sol";

import "../interfaces/mcd/IManager.sol";
import "../interfaces/mcd/ISpotter.sol";
import "../interfaces/mcd/IVat.sol";

/// @title Getter contract for Vault info from Maker protocol
contract McdView is DSMath {
    IManager public constant manager = IManager(0x5ef30b9986345249bc32d8928B7ee64DE9435E39);
    IVat public constant vat = IVat(0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B);
    ISpotter public constant spotter = ISpotter(0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3);

    struct VaultInfo {
        address owner;
        uint256 ratio;
        uint256 collateral;
        uint256 debt;
        bytes32 ilk;
        address urn;
    }

    struct IlkInfo {
        bytes32 ilk;
        uint256 art;
        uint256 rate;
        uint256 spot;
        uint256 line;
        uint256 dust;
        uint256 mat;
        uint256 par;
    }

    /// @notice Gets a price of the asset
    /// @param _ilk Ilk of the CDP
    function getPrice(bytes32 _ilk) public view returns (uint256) {
        (, uint256 mat) = spotter.ilks(_ilk);
        (, , uint256 spot, , ) = vat.ilks(_ilk);

        return rmul(rmul(spot, spotter.par()), mat);
    }

    /// @notice Gets CDP ratio
    /// @param _cdpId Id of the CDP
    /// @param _ilk Ilk of the CDP
    function getRatio(uint256 _cdpId, bytes32 _ilk) public view returns (uint256) {
        uint256 price = getPrice(_ilk);

        (uint256 collateral, uint256 debt) = getCdpInfo(manager, _cdpId, _ilk);

        if (debt == 0) return 0;

        return rdiv(wmul(collateral, price), debt);
    }

    /// @notice Gets CDP info (collateral, debt, price, ilk)
    /// @param _cdpId Id of the CDP
    function getVaultInfo(uint256 _cdpId) public view returns (VaultInfo memory vaultInfo) {
        address urn = manager.urns(_cdpId);
        bytes32 ilk = manager.ilks(_cdpId);

        (uint256 collateral, uint256 debt) = vat.urns(ilk, urn);
        (, uint256 rate, , , ) = vat.ilks(ilk);

        debt = rmul(debt, rate);

        vaultInfo = VaultInfo({
            owner: manager.owns(_cdpId),
            ratio: getRatio(_cdpId, ilk),
            collateral: collateral,
            debt: debt,
            ilk: ilk,
            urn: urn
        });
    }

    function getVaultInfoAndIlkInfo(uint256 _cdpId)
        public
        view
        returns (VaultInfo memory, IlkInfo memory)
    {
        return (getVaultInfo(_cdpId), getIlkInfo(bytes32(0), _cdpId));
    }

    function getIlkInfo(bytes32 _ilk, uint256 _cdpId)
        public
        view
        returns (IlkInfo memory ilkInfo)
    {
        if (_ilk == bytes32(0)) {
            _ilk = manager.ilks(_cdpId);
        }

        ilkInfo.ilk = _ilk;
        (, ilkInfo.mat) = spotter.ilks(_ilk);
        ilkInfo.par = spotter.par();
        (ilkInfo.art, ilkInfo.rate, ilkInfo.spot, ilkInfo.line, ilkInfo.dust) = vat.ilks(_ilk);
    }

    function getVaultInfos(uint256[] memory _cdps)
        public
        view
        returns (VaultInfo[] memory vaultInfos)
    {
        vaultInfos = new VaultInfo[](_cdps.length);

        for (uint256 i = 0; i < _cdps.length; i++) {
            vaultInfos[i] = getVaultInfo(_cdps[i]);
        }
    }

    function getRatios(uint256[] memory _cdps) public view returns (uint256[] memory ratios) {
        ratios = new uint256[](_cdps.length);

        for (uint256 i = 0; i < _cdps.length; i++) {
            bytes32 ilk = manager.ilks(_cdps[i]);

            ratios[i] = getRatio(_cdps[i], ilk);
        }
    }

    function getCdpInfo(
        IManager _manager,
        uint256 _cdpId,
        bytes32 _ilk
    ) public view returns (uint256, uint256) {
        address urn = _manager.urns(_cdpId);

        (uint256 collateral, uint256 debt) = vat.urns(_ilk, urn);
        (, uint256 rate, , , ) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }
}
