// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/QiDaoHelper.sol";
import "../../interfaces/qidao/IStablecoin.sol";

/// @title Open a new QiDao vault
contract QiDaoOpen is ActionBase, QiDaoHelper {
    struct Params {
        uint16 vaultId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        (uint256 vaultId, bytes memory logData) = _qiDaoOpen(inputData);
        emit ActionEvent("QiDaoOpen", logData);
        return bytes32(vaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _qiDaoOpen(inputData);
        logger.logActionDirectEvent("QiDaoOpen", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _qiDaoOpen(inputData);
        logger.logActionDirectEvent("QiDaoOpen", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up an empty vault
    function _qiDaoOpen(Params memory _inputParams)
        internal
        returns (uint256 userVaultId, bytes memory logData)
    {
        address vaultAddress = vaultRegistry.getVaultAddressById(_inputParams.vaultId);
        userVaultId = IStablecoin(vaultAddress).createVault();

        logData = abi.encode(_inputParams, vaultAddress, userVaultId);
    }

    //////////////////////////// Input handling ////////////////////////////
    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes2(params.vaultId));
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.vaultId = uint16(bytes2(encodedInput[0:2]));
    }
}
