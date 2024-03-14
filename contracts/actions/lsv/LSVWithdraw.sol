// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/LSVUtilHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/FeeRecipient.sol";
import "../../utils/Discount.sol";
import "../../exchangeV3/helpers/ExchangeHelper.sol";

/// @title action for tracking users withdrawals within the LSV ecosystem
contract LSVWithdraw is ActionBase, LSVUtilHelper, ExchangeHelper {
    using TokenUtils for address;

    /// @dev 10% fee on profit as we divide profit by this number
    uint256 public constant FEE_DIVIDER = 10;

    /// @param protocol - an ID representing the protocol in LSVProfitTracker
    /// @param token - token which is being withdrawn
    /// @param amount - amount of tokens being withdrawn
    /// @param isPositionClosing - bool representing if the user is fully closing his position
    struct Params {
        uint256 protocol;
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

        (uint256 remainingAmount, bytes memory logData) = _lsvWithdraw(inputData);
        emit ActionEvent("LSVWithdraw", logData);
        return bytes32(remainingAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _lsvWithdraw(inputData);
        logger.logActionDirectEvent("LSVWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @dev LSV Withdraw expects users to have withdrawn tokens to the user's wallet, from which we'll pull the performance fee
    /// @dev ProfitTracker will return realisedProfit amount, from which we will calculate fee
    function _lsvWithdraw(Params memory _inputData) internal returns (uint256 remainingAmount, bytes memory logData) {
        uint256 amountWithdrawnInETH = getAmountInETHFromLST(_inputData.token, _inputData.amount);

        uint256 realisedProfitInETH = LSVProfitTracker(LSV_PROFIT_TRACKER_ADDRESS).withdraw(_inputData.protocol, amountWithdrawnInETH, _inputData.isPositionClosing);
        
        uint256 feeAmountInETH = calculateFee(realisedProfitInETH);
        
        /// @dev fee can maximally be amount withdrawn divided by the fee divider
        if (feeAmountInETH > amountWithdrawnInETH / FEE_DIVIDER) {
            feeAmountInETH = amountWithdrawnInETH / FEE_DIVIDER;
        }
    
        uint256 feeAmount = getAmountInLSTFromETH(_inputData.token, feeAmountInETH);

        address feeAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();
        
        _inputData.token.withdrawTokens(feeAddr, feeAmount);

        remainingAmount = _inputData.amount - feeAmount;
        logData = abi.encode(_inputData, feeAmount, remainingAmount);
    }
    
    /// @dev if someone has a set Discount his fee will be 0%
    function calculateFee(
        uint256 _amount
    ) internal view returns (uint256 feeAmount) {
        if (Discount(DISCOUNT_ADDRESS).serviceFeesDisabled(address(this))) {
            feeAmount = 0;
        } else {
            feeAmount = _amount / FEE_DIVIDER;
        }
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
    
}
