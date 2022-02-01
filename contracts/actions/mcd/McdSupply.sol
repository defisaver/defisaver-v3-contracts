// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd//IVat.sol";
import "../../interfaces/mcd//IJoin.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Supply collateral to a Maker vault
contract McdSupply is ActionBase, McdHelper {
    using TokenUtils for address;

    struct Params {
        uint256 vaultId;
        uint256 amount;
        address joinAddr;
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

        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.joinAddr = _parseParamAddr(inputData.joinAddr, _paramMapping[2], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[3], _subData, _returnValues);
        inputData.mcdManager = _parseParamAddr(inputData.mcdManager, _paramMapping[4], _subData, _returnValues);

        (uint256 returnAmount, bytes memory logData) = _mcdSupply(inputData.vaultId, inputData.amount, inputData.joinAddr, inputData.from, inputData.mcdManager);
        emit ActionEvent("McdSupply", logData);
        return bytes32(returnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdSupply(inputData.vaultId, inputData.amount, inputData.joinAddr, inputData.from, inputData.mcdManager);
        logger.logActionDirectEvent("McdSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies collateral to the vault
    /// @param _vaultId Id of the vault
    /// @param _amount Amount of tokens to supply
    /// @param _joinAddr Join address of the maker collateral
    /// @param _from Address where to pull the collateral from
    /// @param _mcdManager The manager address we are using [mcd, b.protocol]
    function _mcdSupply(
        uint256 _vaultId,
        uint256 _amount,
        address _joinAddr,
        address _from,
        address _mcdManager
    ) internal returns (uint256, bytes memory) {
        address tokenAddr = getTokenFromJoin(_joinAddr);
        IManager mcdManager = IManager(_mcdManager);

        // if amount type(uint).max, pull current _from balance
        if (_amount == type(uint256).max) {
            _amount = tokenAddr.getBalance(_from);
        }

        // Pull the underlying token and join the maker join pool
        tokenAddr.pullTokensIfNeeded(_from, _amount);
        tokenAddr.approveToken(_joinAddr, _amount);
        IJoin(_joinAddr).join(address(this), _amount);

        // format the amount we need for frob
        int256 convertAmount = toPositiveInt(convertTo18(_joinAddr, _amount));

        // Supply to the vault balance
        vat.frob(
            mcdManager.ilks(_vaultId),
            mcdManager.urns(_vaultId),
            address(this),
            address(this),
            convertAmount,
            0
        );
        bytes memory logData = abi.encode(_vaultId, _amount, _joinAddr, _from, _mcdManager);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
