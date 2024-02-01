// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../interfaces/safe/ISafe.sol";

/// @title Helper action to execute a Safe transaction
contract ExecuteSafeTx is ActionBase {
     
    /// @param safe Address of the Safe wallet
    /// @param to Destination address of Safe transaction
    /// @param value Ether value of Safe transaction
    /// @param data Data payload of Safe transaction
    /// @param operation Operation type of Safe transaction. 0 = call, 1 = delegateCall
    /// @param safeTxGas Gas that should be used for the Safe transaction
    /// @param baseGas Gas costs that are independent of the transaction execution(e.g. base transaction fee, signature check, payment of the refund)
    /// @param gasPrice Gas price that should be used for the payment calculation
    /// @param gasToken  Token address (or 0 if ETH) that is used for the payment
    /// @param refundReceiver Address of receiver of gas payment (or 0 if tx.origin
    /// @param signatures Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
    struct Params {
        address safe;
        address to;
        uint256 value;
        bytes data;
        ISafe.Operation operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        bytes signatures;
    }

    error SafeExecutionError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.safe = _parseParamAddr(params.safe, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.value = _parseParamUint(params.value, _paramMapping[2], _subData, _returnValues);
        params.operation = ISafe.Operation(_parseParamUint(uint8(params.operation), _paramMapping[3], _subData, _returnValues));
        params.safeTxGas = _parseParamUint(params.safeTxGas, _paramMapping[4], _subData, _returnValues);
        params.baseGas = _parseParamUint(params.baseGas, _paramMapping[5], _subData, _returnValues);
        params.gasPrice = _parseParamUint(params.gasPrice, _paramMapping[6], _subData, _returnValues);
        params.gasToken = _parseParamAddr(params.gasToken, _paramMapping[7], _subData, _returnValues);
        params.refundReceiver = payable(_parseParamAddr(params.refundReceiver, _paramMapping[8], _subData, _returnValues));

        _executeSafeTx(params);

        emit ActionEvent("ExecuteSafeTx", abi.encode(params));
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _executeSafeTx(params);

        logger.logActionDirectEvent("ExecuteSafeTx", abi.encode(params));
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _executeSafeTx(Params memory _params) internal {
        bool success = ISafe(_params.safe).execTransaction(
            _params.to,
            _params.value,
            _params.data,
            _params.operation,
            _params.safeTxGas,
            _params.baseGas,
            _params.gasPrice,
            _params.gasToken,
            _params.refundReceiver,
            _params.signatures
        );
        if (!success) {
            revert SafeExecutionError();
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
