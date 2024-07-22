// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { IDebtToken } from "../../interfaces/aaveV3/IDebtToken.sol";

/// @title Delegate credit for someone to borrow on user's wallet behalf with his signature
contract AaveV3DelegateWithSig is ActionBase {

    struct Params {
        address debtToken;
        address delegator;
        address delegatee;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        (bytes memory logData) = _delegate(params);
        emit ActionEvent("AaveV3DelegateWithSig", logData);
        return bytes32(params.value);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (bytes memory logData) = _delegate(params);
        logger.logActionDirectEvent("AaveV3DelegateWithSig", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (bytes memory logData) = _delegate(params);
        logger.logActionDirectEvent("AaveV3DelegateWithSig", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _delegate(Params memory _params)
        internal
        returns (bytes memory logData)
    {
        IDebtToken(_params.debtToken).delegationWithSig(
            _params.delegator, 
            _params.delegatee,
            _params.value,
            _params.deadline, 
            _params.v, 
            _params.r, 
            _params.s
            );
        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory _params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes20(_params.debtToken));
        encodedInput = bytes.concat(encodedInput, bytes20(_params.delegator));
        encodedInput = bytes.concat(encodedInput, bytes20(_params.delegatee));
        encodedInput = bytes.concat(encodedInput, bytes32(_params.value));
        encodedInput = bytes.concat(encodedInput, bytes32(_params.deadline));
        encodedInput = bytes.concat(encodedInput, bytes1(_params.v));
        encodedInput = bytes.concat(encodedInput, bytes32(_params.r));
        encodedInput = bytes.concat(encodedInput, bytes32(_params.s));
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.debtToken = address(bytes20(_encodedInput[0:20]));
        params.delegator = address(bytes20(_encodedInput[20:40]));
        params.delegatee = address(bytes20(_encodedInput[40:60]));
        params.value = uint256(bytes32(_encodedInput[60:92]));
        params.deadline = uint256(bytes32(_encodedInput[92:124]));
        params.v = uint8(bytes1(_encodedInput[124:125]));
        params.r = bytes32(_encodedInput[125:157]);
        params.s = bytes32(_encodedInput[157:189]);
    }
}
