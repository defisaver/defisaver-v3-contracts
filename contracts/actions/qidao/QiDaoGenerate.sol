// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/QiDaoHelper.sol";
import "../../interfaces/qidao/IStablecoin.sol";

/// @title Generates MAI as debt from QiDaoVault
contract QiDaoGenerate is ActionBase, QiDaoHelper {
    using TokenUtils for address;

    struct Params {
        uint16 vaultId;
        uint32 userVaultId;
        uint128 amount;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.vaultId = uint16(_parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues));

        inputData.userVaultId = uint32(_parseParamUint(
            inputData.userVaultId,
            _paramMapping[1],
            _subData,
            _returnValues
        ));
        inputData.amount = uint128(_parseParamUint(
            inputData.amount,
            _paramMapping[2],
            _subData,
            _returnValues
        ));
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _qiDaoGenerate(inputData);
        emit ActionEvent("QiDaoGenerate", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _qiDaoGenerate(inputData);
        logger.logActionDirectEvent("QiDaoGenerate", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _qiDaoGenerate(inputData);
        logger.logActionDirectEvent("QiDaoGenerate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _qiDaoGenerate(Params memory _inputParams)
        internal
        returns (uint256, bytes memory logData)
    {
        if (_inputParams.to == address(0)) revert NullAddressTransfer();
        address vaultAddress = vaultRegistry.getVaultAddressById(_inputParams.vaultId);

        IStablecoin(vaultAddress).borrowToken(_inputParams.userVaultId, _inputParams.amount);

        MAI_STABLECOIN_ADDRESS.withdrawTokens(_inputParams.to, _inputParams.amount);

        logData = abi.encode(vaultAddress, _inputParams);
        return (_inputParams.amount, logData);
    }

    //////////////////////////// Input handling ////////////////////////////
    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes2(params.vaultId));
        encodedInput = bytes.concat(encodedInput, bytes4(params.userVaultId));
        encodedInput = bytes.concat(encodedInput, bytes16(params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(params.to));
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.vaultId = uint16(bytes2(encodedInput[0:2]));
        params.userVaultId = uint32(bytes4(encodedInput[2:6]));
        params.amount = uint128(bytes16(encodedInput[6:22]));
        params.to = address(bytes20(encodedInput[22:42]));
    }
}
