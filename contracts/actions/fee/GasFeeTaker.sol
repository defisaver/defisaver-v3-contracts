// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FeeRecipient } from "../../utils/FeeRecipient.sol";
import { ActionBase } from "../ActionBase.sol";
import { GasFeeHelper } from "./helpers/GasFeeHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Helper action to take gas fee from the user's wallet and send it to the fee recipient.
contract GasFeeTaker is ActionBase, GasFeeHelper {
    using TokenUtils for address;

    /// @param gasUsed Gas used by the transaction
    /// @param feeToken Address of the token to send
    /// @param availableAmount Amount of tokens available to send
    /// @param dfsFeeDivider Divider for the DFS fee
    struct GasFeeTakerParams {
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
        GasFeeTakerParams memory inputData = parseInputsGasFeeTaker(_callData);

        inputData.feeToken = _parseParamAddr(inputData.feeToken, _paramMapping[0], _subData, _returnValues);
        inputData.availableAmount = _parseParamUint(inputData.availableAmount, _paramMapping[1], _subData, _returnValues);
        inputData.dfsFeeDivider = _parseParamUint(inputData.dfsFeeDivider, _paramMapping[2], _subData, _returnValues);

        /// @dev This means inputData.availableAmount is not being piped into
        /// @dev To stop sender from sending any value here, if not piped take user's wallet balance
        if (_paramMapping[1] == 0) {
            inputData.availableAmount = inputData.feeToken.getBalance(address(this));
        }

        uint256 amountLeft = _takeFee(inputData);

        emit ActionEvent("GasFeeTaker", abi.encode(inputData, amountLeft));
        return bytes32(amountLeft);
    }

    function _takeFee(GasFeeTakerParams memory _inputData) internal returns (uint256 amountLeft) {
        uint256 txCost = calcGasCost(_inputData.gasUsed, _inputData.feeToken, 0);

        // cap at 20% of the max amount
        if (txCost >= (_inputData.availableAmount / 5)) {
            txCost = _inputData.availableAmount / 5;
        }

        if (_inputData.dfsFeeDivider != 0) {
            /// @notice If divider is lower the fee is greater, should be max 5 bps
            if (_inputData.dfsFeeDivider < MAX_DFS_FEE) {
                _inputData.dfsFeeDivider = MAX_DFS_FEE;
            }

            // add amount we take for dfs fee as well
            txCost += _inputData.availableAmount / _inputData.dfsFeeDivider;
        }

        amountLeft = sub(_inputData.availableAmount, txCost);
        _inputData.feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable virtual override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }

    function parseInputsGasFeeTaker(bytes memory _callData) public pure returns (GasFeeTakerParams memory inputData) {
        inputData = abi.decode(_callData, (GasFeeTakerParams));
    }
}
