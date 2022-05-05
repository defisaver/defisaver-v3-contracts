// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/mcd/ICropJoin.sol";
import "../../interfaces/mcd/ICropper.sol";
import "../../interfaces/mcd/ICdpRegistry.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Withdraws collateral from a Maker vault
contract McdWithdraw is ActionBase, McdHelper {
    using TokenUtils for address;
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

    /// @notice Withdraws collateral from the vault
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

    /// @notice Returns all the collateral of the vault, formatted in the correct decimal
    /// @dev Will fail if token is over 18 decimals
    function getAllColl(IManager _mcdManager, address _joinAddr, uint _vaultId) internal view returns (uint amount) {
        bytes32 ilk;

        if (address(_mcdManager) == CROPPER) {
            ilk = ICdpRegistry(CDP_REGISTRY).ilks(_vaultId);
        } else {
            ilk = _mcdManager.ilks(_vaultId);
        }

        (amount, ) = getCdpInfo(
            _mcdManager,
            _vaultId,
            ilk
        );

        if (IJoin(_joinAddr).dec() != 18) {
            return div(amount, 10 ** sub(18, IJoin(_joinAddr).dec()));
        }

    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
