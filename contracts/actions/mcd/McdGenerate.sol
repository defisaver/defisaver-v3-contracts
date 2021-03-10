// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/ISpotter.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Generate dai from a Maker Vault
contract McdGenerate is ActionBase, McdHelper {

    using TokenUtils for address;

    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    address public constant JUG_ADDRESS = 0x19c0976f590D67707E62397C87829d896Dc0f1F1;
    address public constant SPOTTER_ADDRESS = 0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3;
    address public constant DAI_JOIN_ADDRESS = 0x9759A6Ac90977b93B58547b4A71c78317f391A28;
    address public constant DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    IVat public constant vat = IVat(VAT_ADDRESS);
    ISpotter public constant spotter = ISpotter(SPOTTER_ADDRESS);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        (uint256 cdpId, uint256 amount, address to, address mcdManager) = parseInputs(_callData);

        cdpId = _parseParamUint(cdpId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        amount = _mcdGenerate(cdpId, amount, to, mcdManager);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable   {
        (uint256 cdpId, uint256 amount, address to, address mcdManager) = parseInputs(_callData);

        _mcdGenerate(cdpId, amount, to, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }



    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Generates dai from a specified vault
    /// @dev The actual generated amount might differ, as it will generate up to max debt for vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be generated
    /// @param _to Address which will receive the dai
    /// @param _mcdManager The manager address we are using
    function _mcdGenerate(
        uint256 _vaultId,
        uint256 _amount,
        address _to,
        address _mcdManager
    ) internal returns (uint256) {
        bytes32 ilk = IManager(_mcdManager).ilks(_vaultId);

        uint256 rate = IJug(JUG_ADDRESS).drip(ilk);
        uint256 daiVatBalance = vat.dai(IManager(_mcdManager).urns(_vaultId));

        uint256 maxAmount = getMaxDebt(_mcdManager, _vaultId, ilk);

        // can't generate more than max amount
        if (_amount >= maxAmount) {
            _amount = maxAmount;
        }

        IManager(_mcdManager).frob(_vaultId, int256(0), normalizeDrawAmount(_amount, rate, daiVatBalance));
        IManager(_mcdManager).move(_vaultId, address(this), toRad(_amount));

        if (vat.can(address(this), address(DAI_JOIN_ADDRESS)) == 0) {
            vat.hope(DAI_JOIN_ADDRESS);
        }

        IDaiJoin(DAI_JOIN_ADDRESS).exit(_to, _amount);

        DAI_ADDRESS.withdrawTokens(_to, _amount);

        logger.Log(address(this), msg.sender, "McdGenerate", abi.encode(_vaultId, _amount));

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address to,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
        mcdManager = abi.decode(_callData[3], (address));
    }

    /// @notice Gets the maximum amount of debt available to generate
    /// @param _mcdManager Manager addr
    /// @param _cdpId Id of the CDP
    /// @param _ilk Ilk of the CDP
    /// @dev Substracts 10 wei to aviod rounding error later on
    function getMaxDebt(address _mcdManager, uint256 _cdpId, bytes32 _ilk) internal view returns (uint256) {
        uint256 price = getPrice(_ilk);

        (, uint256 mat) = spotter.ilks(_ilk);
        (uint256 collateral, uint256 debt) = getCdpInfo(IManager(_mcdManager), _cdpId, _ilk);

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
