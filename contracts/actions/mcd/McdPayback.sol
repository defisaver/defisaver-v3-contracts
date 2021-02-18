// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Payback dai debt for a Maker vault
contract McdPayback is ActionBase, McdHelper, TokenUtils, GasBurner {
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;
    address public constant DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    address public constant DAI_JOIN_ADDRESS = 0x9759A6Ac90977b93B58547b4A71c78317f391A28;

    IVat public constant vat = IVat(VAT_ADDRESS);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        (uint256 vaultId, uint256 amount, address from, address mcdManager) = parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        amount = _mcdPayback(vaultId, amount, from, mcdManager);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (uint256 vaultId, uint256 amount, address from, address mcdManager) = parseInputs(_callData);

        _mcdPayback(vaultId, amount, from, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Paybacks the debt for a specified vault
    /// @dev If amount over the whole debt only the whole debt amount is pulled
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be payed back
    /// @param _from Where the Dai is pulled from
    /// @param _mcdManager The manager address we are using
    function _mcdPayback(
        uint256 _vaultId,
        uint256 _amount,
        address _from,
        address _mcdManager
    ) internal returns (uint256) {
        address urn = IManager(_mcdManager).urns(_vaultId);
        bytes32 ilk = IManager(_mcdManager).ilks(_vaultId);

        uint256 wholeDebt = getAllDebt(VAT_ADDRESS, urn, urn, ilk);

        // can't repay more than the whole debt
        if (_amount > wholeDebt) {
            _amount = wholeDebt;
        }

        pullTokens(DAI_ADDRESS, _from, _amount);
        approveToken(DAI_ADDRESS, DAI_JOIN_ADDRESS, _amount);

        IDaiJoin(DAI_JOIN_ADDRESS).join(urn, _amount);

        IManager(_mcdManager).frob(_vaultId, 0, normalizePaybackAmount(VAT_ADDRESS, urn, ilk));

        logger.Log(address(this), msg.sender, "McdPayback", abi.encode(_vaultId, _amount, _from));

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            uint256 amount,
            address from,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
        mcdManager = abi.decode(_callData[3], (address));
    }
}
