// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { GasFeeHelper } from "../../utils/fee/GasFeeHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";

/// @title Helper action to take gas fee from the user's wallet and send it to the fee recipient.
contract GasFeeTaker is ActionBase, GasFeeHelper {
    using TokenUtils for address;

    /// @param gasUsed Gas used by the transaction
    /// @param feeToken Address of the token to send
    /// @param availableAmount Amount of tokens available to send
    /// @param dfsFeeDivider Divider for the DFS fee
    struct Params {
        uint256 gasUsed;
        address feeToken;
        uint256 availableAmount;
        uint256 dfsFeeDivider;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.feeToken =
            _parseParamAddr(inputData.feeToken, _paramMapping[0], _subData, _returnValues);
        inputData.availableAmount =
            _parseParamUint(inputData.availableAmount, _paramMapping[1], _subData, _returnValues);
        inputData.dfsFeeDivider =
            _parseParamUint(inputData.dfsFeeDivider, _paramMapping[2], _subData, _returnValues);

        /// @dev This means inputData.availableAmount is not being piped into
        /// @dev To stop sender from sending any value here, if not piped take user's wallet balance
        if (_paramMapping[1] == 0) {
            inputData.availableAmount = inputData.feeToken.getBalance(address(this));
        }

        uint256 feeTaken = takeGasAndAutomationFee(
            inputData.gasUsed,
            inputData.feeToken,
            inputData.availableAmount,
            inputData.dfsFeeDivider
        );

        uint256 amountLeft = inputData.availableAmount - feeTaken;

        emit ActionEvent("GasFeeTaker", abi.encode(inputData, amountLeft));

        return bytes32(amountLeft);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
