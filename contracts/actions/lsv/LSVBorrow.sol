// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/LSVUtilHelper.sol";

/// @title action for tracking users borrowings within the LSV ecosystem
contract LSVBorrow is ActionBase, LSVUtilHelper {

    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param amount - amount of token being borrowed
    struct Params {
        uint256 protocol;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        (bytes memory logData) = _lsvBorrow(inputData);
        emit ActionEvent("LSVBorrow", logData);
        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (bytes memory logData) = _lsvBorrow(inputData);
        logger.logActionDirectEvent("LSVBorrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _lsvBorrow(Params memory _inputData) internal returns (bytes memory logData) {
        LSVProfitTracker(LSV_PROFIT_TRACKER_ADDRESS).borrow(_inputData.protocol, _inputData.amount);

        logData = abi.encode(_inputData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
