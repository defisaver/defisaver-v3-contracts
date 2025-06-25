// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IManager } from "../../interfaces/mcd/IManager.sol";
import { IJoin } from "../../interfaces/mcd/IJoin.sol";
import { ICropper } from "../../interfaces/mcd/ICropper.sol";
import { ICdpRegistry } from "../../interfaces/mcd/ICdpRegistry.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { McdHelper } from "./helpers/McdHelper.sol";

/// @title Withdraws collateral from a Maker vault
contract McdWithdraw is ActionBase, McdHelper {
    using TokenUtils for address;

    /// @param vaultId Id of the vault
    /// @param amount Amount of collateral to withdraw
    /// @param joinAddr Join address of the maker collateral
    /// @param to Address where to send the collateral we withdrew
    /// @param mcdManager The manager address we are using [mcd, b.protocol]
    struct Params {
        uint256 vaultId;
        uint256 amount;
        address joinAddr;
        address to;
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
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);
        inputData.mcdManager = _parseParamAddr(inputData.mcdManager, _paramMapping[4], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _mcdWithdraw(inputData.vaultId, inputData.amount, inputData.joinAddr, inputData.to, inputData.mcdManager);
        emit ActionEvent("McdWithdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdWithdraw(inputData.vaultId, inputData.amount, inputData.joinAddr, inputData.to, inputData.mcdManager);
        logger.logActionDirectEvent("McdWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @param _vaultId Id of the vault
    /// @param _amount Amount of collateral to withdraw
    /// @param _joinAddr Join address of the maker collateral
    /// @param _to Address where to send the collateral we withdrew
    /// @param _mcdManager The manager address we are using [mcd, b.protocol]
    function _mcdWithdraw(
        uint256 _vaultId,
        uint256 _amount,
        address _joinAddr,
        address _to,
        address _mcdManager
    ) internal returns (uint256, bytes memory) {
        // if amount type(uint).max _amount is whole collateral amount
        if (_amount == type(uint256).max) {
            _amount = getAllColl(IManager(_mcdManager), _joinAddr, _vaultId);
        }

        // convert to 18 decimals for maker frob if needed
        uint256 frobAmount = convertTo18(_joinAddr, _amount);

         if (_mcdManager == CROPPER) {
            _cropperWithdraw(_vaultId, _joinAddr, _amount, frobAmount);
        } else {
            _mcdManagerWithdraw(_mcdManager, _vaultId, _joinAddr, _amount, frobAmount);
        }

        // send the tokens _to address if needed
        getTokenFromJoin(_joinAddr).withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(_vaultId, _amount, _joinAddr, _to, _mcdManager);
        return (_amount, logData);
    }

    function _mcdManagerWithdraw(
        address _mcdManager,
        uint256 _vaultId,
        address _joinAddr,
        uint256 _amount,
        uint256 _frobAmount
    ) internal {
        IManager mcdManager = IManager(_mcdManager);

        // withdraw from vault and move to proxy balance
        mcdManager.frob(_vaultId, -toPositiveInt(_frobAmount), 0);
        mcdManager.flux(_vaultId, address(this), _frobAmount);

        // withdraw the tokens from Join
        IJoin(_joinAddr).exit(address(this), _amount);
    }

    function _cropperWithdraw(
        uint256 _vaultId,
        address _joinAddr,
        uint256 _amount,
        uint256 _frobAmount
    ) internal {
        bytes32 ilk = ICdpRegistry(CDP_REGISTRY).ilks(_vaultId);
        address owner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);

        ICropper(CROPPER).frob(ilk, owner, owner, owner, -toPositiveInt(_frobAmount), 0);
        // Exits token amount to proxy address as a token
        ICropper(CROPPER).exit(_joinAddr, address(this), _amount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
