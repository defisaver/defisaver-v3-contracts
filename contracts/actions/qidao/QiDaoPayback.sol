// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/QiDaoHelper.sol";
import "../../interfaces/qidao/IStablecoin.sol";

/// @title Paybacks MAI debt to a QiDao vault
contract QiDaoPayback is ActionBase, QiDaoHelper {
    using TokenUtils for address;

    struct Params {
        uint16 vaultId;
        uint32 userVaultId;
        uint128 amount;
        address from;
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
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[3], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _qiDaoPayback(inputData);
        emit ActionEvent("QiDaoPayback", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _qiDaoPayback(inputData);
        logger.logActionDirectEvent("QiDaoPayback", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _qiDaoPayback(inputData);
        logger.logActionDirectEvent("QiDaoPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _qiDaoPayback(Params memory _inputParams)
        internal
        returns (uint256, bytes memory logData)
    {
        address vaultAddress = vaultRegistry.getVaultAddressById(_inputParams.vaultId);

        uint256 debt = IStablecoin(vaultAddress).vaultDebt(_inputParams.userVaultId);

        _inputParams.amount = _inputParams.amount > debt ? uint128(debt) : _inputParams.amount;

        MAI_STABLECOIN_ADDRESS.pullTokensIfNeeded(_inputParams.from, _inputParams.amount);
        MAI_STABLECOIN_ADDRESS.approveToken(vaultAddress, _inputParams.amount);

        IStablecoin(vaultAddress).payBackToken(_inputParams.userVaultId, _inputParams.amount);

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
        encodedInput = bytes.concat(encodedInput, bytes20(params.from));
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.vaultId = uint16(bytes2(encodedInput[0:2]));
        params.userVaultId = uint32(bytes4(encodedInput[2:6]));
        params.amount = uint128(bytes16(encodedInput[6:22]));
        params.from = address(bytes20(encodedInput[22:42]));
    }
}
