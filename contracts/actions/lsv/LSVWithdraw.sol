// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/LSVUtilHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/FeeRecipient.sol";

/// @title 
contract LSVWithdraw is ActionBase, LSVUtilHelper {
    using TokenUtils for address;

    /// @param protocol - 
    /// @param token - 
    /// @param amount -
    /// @param isPositionClosing -
    struct Params {
        uint8 protocol;
        address token;
        uint256 amount;
        bool isPositionClosing;
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

        (uint256 remainingAmount, bytes memory logData) = _lsvWithdraw(inputData);
        emit ActionEvent("LSVSupply", logData);
        return bytes32(remainingAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _lsvWithdraw(inputData);
        logger.logActionDirectEvent("LSVSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _lsvWithdraw(Params memory _inputData) internal returns (uint256 remainingAmount, bytes memory logData) {
        uint256 amountWithdrawnInETH = getAmountInETHFromLST(_inputData.token, _inputData.amount);
        uint256 feeAmountInETH = LSVProfitTracker(LSV_PROFIT_TRACKER_ADDRESS).withdraw(_inputData.protocol, amountWithdrawnInETH, _inputData.isPositionClosing);

        uint256 feeAmount = getAmountInLSTFromETH(_inputData.token, feeAmountInETH);
        
        address feeAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();

        _inputData.token.withdrawTokens(feeAddr, feeAmount);

        remainingAmount = _inputData.amount - feeAmount;
        logData = abi.encode(_inputData, feeAmount, remainingAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
