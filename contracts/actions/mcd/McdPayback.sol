// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Payback dai debt for a Maker vault
contract McdPayback is ActionBase, McdHelper {
    using TokenUtils for address;

    /// @param _vaultId Id of the vault
    /// @param _amount Amount of dai to be payed back
    /// @param _from Where the Dai is pulled from
    /// @param _mcdManager The manager address we are using
    struct Params {
        uint256 vaultId;
        uint256 amount;
        address from;
        address mcdManager;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        inputData.vaultId = _parseParamUint(
            inputData.vaultId,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(
            inputData.from,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        bytes memory logData = _mcdPayback(inputData);
        emit ActionEvent("McdPayback", logData);
        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        bytes memory logData = _mcdPayback(inputData);
        logger.logActionDirectEvent("McdPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Paybacks the debt for a specified vault
    function _mcdPayback(Params memory _inputData) internal returns (bytes memory logData) {
        IManager mcdManager = IManager(_inputData.mcdManager);

        address urn = mcdManager.urns(_inputData.vaultId);
        bytes32 ilk = mcdManager.ilks(_inputData.vaultId);

        // if _amount is higher than current debt, repay all debt
        uint256 debt = getAllDebt(address(vat), urn, urn, ilk);
        _inputData.amount = _inputData.amount > debt ? debt : _inputData.amount;
        // pull Dai from user and join the maker pool
        DAI_ADDR.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        DAI_ADDR.approveToken(DAI_JOIN_ADDR, _inputData.amount);
        IDaiJoin(DAI_JOIN_ADDR).join(urn, _inputData.amount);

        // decrease the vault debt
        mcdManager.frob(_inputData.vaultId, 0, normalizePaybackAmount(address(vat), urn, ilk));

        logData = abi.encode(_inputData, debt);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

}
