// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/QiDaoHelper.sol";
import "../../interfaces/qidao/IStablecoin.sol";

/// @title Supplies collateral to a QiDao Vault
contract QiDaoSupply is ActionBase, QiDaoHelper {
    using TokenUtils for address;

    struct Params {
        uint16 vaultId;
        uint256 userVaultId;
        uint256 amount;
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

        inputData.userVaultId = _parseParamUint(
            inputData.userVaultId,
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
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[2], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _qiDaoSupply(inputData);
        emit ActionEvent("QiDaoSupply", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _qiDaoSupply(params);
        logger.logActionDirectEvent("QiDaoSupply", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _qiDaoSupply(params);
        logger.logActionDirectEvent("QiDaoSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _qiDaoSupply(Params memory _inputParams)
        internal
        returns (uint256, bytes memory logData)
    {
        if (_inputParams.from == address(0)) revert NullAddressTransfer();

        address vaultAddress = vaultRegistry.vaultAddressById(_inputParams.vaultId);
        address collateralAsset = IStablecoin(vaultAddress).collateral();

        collateralAsset.pullTokensIfNeeded(_inputParams.from, _inputParams.amount);
        collateralAsset.approveToken(vaultAddress, _inputParams.amount);

        IStablecoin(vaultAddress).depositCollateral(_inputParams.userVaultId, _inputParams.amount);

        logData = abi.encode(vaultAddress, collateralAsset, _inputParams);
        return (_inputParams.amount, logData);
    }

    //////////////////////////// Input handling ////////////////////////////
    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes2(params.vaultId));
        encodedInput = bytes.concat(encodedInput, bytes32(params.userVaultId));
        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(params.from));
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.vaultId = uint16(bytes2(encodedInput[0:2]));
        params.userVaultId = uint256(bytes32(encodedInput[2:34]));
        params.amount = uint256(bytes32(encodedInput[34:66]));
        params.from = address(bytes20(encodedInput[66:86]));
    }
}
