// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/ISpotter.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/GasBurner.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Generate dai from a Maker Vault
contract McdGenerate is ActionBase, McdHelper, TokenUtils, GasBurner {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    address public constant JUG_ADDRESS = 0x19c0976f590D67707E62397C87829d896Dc0f1F1;
    address public constant SPOTTER_ADDRESS = 0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3;
    address public constant DAI_JOIN_ADDRESS = 0x9759A6Ac90977b93B58547b4A71c78317f391A28;
    address public constant DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    IManager public constant manager = IManager(MANAGER_ADDRESS);
    IVat public constant vat = IVat(VAT_ADDRESS);
    ISpotter public constant spotter = ISpotter(SPOTTER_ADDRESS);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        (uint256 cdpId, uint256 amount, address to) = parseInputs(_callData);

        cdpId = _parseParamUint(cdpId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        amount = _mcdGenerate(cdpId, amount, to);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (uint256 cdpId, uint256 amount, address to) = parseInputs(_callData);

        _mcdGenerate(cdpId, amount, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }



    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _mcdGenerate(
        uint256 _cdpId,
        uint256 _amount,
        address _to
    ) internal returns (uint256) {
        bytes32 ilk = manager.ilks(_cdpId);

        uint256 rate = IJug(JUG_ADDRESS).drip(ilk);
        uint256 daiVatBalance = vat.dai(manager.urns(_cdpId));

        uint256 maxAmount = getMaxDebt(_cdpId, ilk);

        // can't generate more than max amount
        if (_amount >= maxAmount) {
            _amount = maxAmount;
        }

        manager.frob(_cdpId, int256(0), normalizeDrawAmount(_amount, rate, daiVatBalance));
        manager.move(_cdpId, address(this), toRad(_amount));

        if (vat.can(address(this), address(DAI_JOIN_ADDRESS)) == 0) {
            vat.hope(DAI_JOIN_ADDRESS);
        }

        IDaiJoin(DAI_JOIN_ADDRESS).exit(address(this), _amount);

        withdrawTokens(DAI_ADDRESS, _to, _amount);

        logger.Log(address(this), msg.sender, "McdGenerate", abi.encode(_cdpId, _amount));

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address to
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
    }

    /// @notice Gets the maximum amount of debt available to generate
    /// @param _cdpId Id of the CDP
    /// @param _ilk Ilk of the CDP
    /// @dev Substracts 10 wei to aviod rounding error later on
    function getMaxDebt(uint256 _cdpId, bytes32 _ilk) internal view returns (uint256) {
        uint256 price = getPrice(_ilk);

        (, uint256 mat) = spotter.ilks(_ilk);
        (uint256 collateral, uint256 debt) = getCdpInfo(manager, _cdpId, _ilk);

        return sub(sub(div(mul(collateral, price), mat), debt), 10);
    }

    /// @notice Gets a price of the asset
    /// @param _ilk Ilk of the CDP
    function getPrice(bytes32 _ilk) internal view returns (uint256) {
        (, uint256 mat) = spotter.ilks(_ilk);
        (, , uint256 spot, , ) = vat.ilks(_ilk);

        return rmul(rmul(spot, spotter.par()), mat);
    }
}
