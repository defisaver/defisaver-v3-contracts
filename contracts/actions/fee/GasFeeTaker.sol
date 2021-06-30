// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;


import "../../utils/FeeRecipient.sol";
import "../ActionBase.sol";
import "./helpers/GasFeeHelper.sol";

/// @title Helper action to send a token to the specified address
contract GasFeeTaker is ActionBase, GasFeeHelper {
    using TokenUtils for address;

    struct Params {
        uint256 gasUsed;
        address feeToken;
        uint256 availableAmount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.feeToken = _parseParamAddr(inputData.feeToken, _paramMapping[0], _subData, _returnValues);
        inputData.availableAmount = _parseParamUint(inputData.availableAmount, _paramMapping[1], _subData, _returnValues);

        uint256 txCost = calcGasCost(inputData.gasUsed, inputData.feeToken);

        if (inputData.availableAmount == type(uint256).max) {
            inputData.availableAmount =  inputData.feeToken.getBalance(address(this));
        }

        require(inputData.availableAmount >= txCost, "Not enough funds for gas fee");

        uint256 amountLeft = sub(inputData.availableAmount, txCost);

        inputData.feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);

        logger.Log(address(this), msg.sender, "GasFeeTaker", abi.encode(inputData, amountLeft));

        return bytes32(amountLeft);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
