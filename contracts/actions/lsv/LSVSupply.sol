// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/LSVUtilHelper.sol";

/// @title action for tracking users supply within the LSV ecosystem
contract LSVSupply is ActionBase, LSVUtilHelper {

    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param token - token which is being supplied to the protocol
    /// @param amount - amount of token being supplied
    struct Params {
        uint256 protocol;
        address token;
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

        inputData.token = _parseParamAddr(
            inputData.token,
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

        (uint256 amountSentToTracker, bytes memory logData) = _lsvSupply(inputData);
        emit ActionEvent("LSVSupply", logData);
        return bytes32(amountSentToTracker);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _lsvSupply(inputData);
        logger.logActionDirectEvent("LSVSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _lsvSupply(Params memory _inputData) internal returns (uint256 amountSuppliedInETH, bytes memory logData) {
        amountSuppliedInETH = getAmountInETHFromLST(_inputData.token, _inputData.amount);
        LSVProfitTracker(LSV_PROFIT_TRACKER_ADDRESS).supply(_inputData.protocol, amountSuppliedInETH);

        logData = abi.encode(_inputData, amountSuppliedInETH);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
