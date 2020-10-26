// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../DS/DSMath.sol";
import "../interfaces/mcd/IManager.sol";
import "../interfaces/mcd/IVat.sol";
import "../interfaces/mcd/ISpotter.sol";
import "../core/Subscriptions.sol";

import "../interfaces/ITrigger.sol";

contract McdRatioTrigger is ITrigger, DSMath {

    IManager public constant manager = IManager(0x5ef30b9986345249bc32d8928B7ee64DE9435E39);
    IVat public constant vat = IVat(0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B);
    ISpotter public constant spotter = ISpotter(0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3);

    enum RatioState { OVER, UNDER }

    function isTriggered(bytes memory _callData, bytes memory _subData) public override returns (bool) {
        (uint nextPrice) = parseParamData(_callData);
        (uint cdpId, uint ratio, RatioState state) = parseSubData(_subData);

        uint currRatio = getRatio(cdpId, nextPrice);

        if (state == RatioState.OVER) {
            if (currRatio > ratio) return true;
        }

        if (state == RatioState.UNDER) {
            if (currRatio < ratio) return true;
        }

        return false;
    }

    function parseSubData(bytes memory _data) public pure returns (uint, uint, RatioState) {
        (uint cdpId, uint ratio, uint8 state) = abi.decode(_data, (uint256,uint256,uint8));

        return (cdpId, ratio, RatioState(state));
    }

    function parseParamData(bytes memory _data) public pure returns (uint nextPrice) {
        (nextPrice) = abi.decode(_data, (uint256));
    }

    /// @notice Gets CDP ratio
    /// @param _cdpId Id of the CDP
    /// @param _nextPrice Next price for user
    function getRatio(uint _cdpId, uint _nextPrice) public view returns (uint) {
        bytes32 ilk = manager.ilks(_cdpId);
        uint price = (_nextPrice == 0) ? getPrice(ilk) : _nextPrice;

        (uint collateral, uint debt) = getCdpInfo(_cdpId, ilk);

        if (debt == 0) return 0;

        return rdiv(wmul(collateral, price), debt) / (10 ** 18);
    }

    /// @notice Gets CDP info (collateral, debt)
    /// @param _cdpId Id of the CDP
    /// @param _ilk Ilk of the CDP
    function getCdpInfo(uint _cdpId, bytes32 _ilk) public view returns (uint, uint) {
        address urn = manager.urns(_cdpId);

        (uint collateral, uint debt) = vat.urns(_ilk, urn);
        (,uint rate,,,) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }

    /// @notice Gets a price of the asset
    /// @param _ilk Ilk of the CDP
    function getPrice(bytes32 _ilk) public view returns (uint) {
        (, uint mat) = spotter.ilks(_ilk);
        (,,uint spot,,) = vat.ilks(_ilk);

        return rmul(rmul(spot, spotter.par()), mat);
    }
}
