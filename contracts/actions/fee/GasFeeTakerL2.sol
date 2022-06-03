// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;


import "../../utils/FeeRecipient.sol";
import "../ActionBase.sol";
import "./helpers/GasFeeHelper.sol";

import "hardhat/console.sol";

/// @title Helper action to send a token to the specified address
contract GasFeeTakerL2 is ActionBase, GasFeeHelper {
    using TokenUtils for address;

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

        inputData.feeToken = _parseParamAddr(inputData.feeToken, _paramMapping[0], _subData, _returnValues);
        inputData.availableAmount = _parseParamUint(inputData.availableAmount, _paramMapping[1], _subData, _returnValues);
        inputData.dfsFeeDivider = _parseParamUint(inputData.dfsFeeDivider, _paramMapping[2], _subData, _returnValues);

        uint256 txCost = calcGasCost(inputData.gasUsed, inputData.feeToken);

        /// @dev This means inputData.availableAmount is not being piped into
        /// @dev To stop sender from sending any value here, if not piped take proxy balance
        if (_paramMapping[1] == 0) {
            inputData.availableAmount = inputData.feeToken.getBalance(address(this));
        }

        console.log("txCost: ", txCost);

        // cap at 20% of the max amount
        if (txCost >= (inputData.availableAmount / 5)) {
            txCost = inputData.availableAmount / 5;
        }

        /// @dev If divider is lower the fee is greater, should be max 5 bps
        if (inputData.dfsFeeDivider < MAX_DFS_FEE) {
            inputData.dfsFeeDivider = MAX_DFS_FEE;
        }

        // add amount we take for dfs fee as well
        txCost += inputData.availableAmount / inputData.dfsFeeDivider;

        uint256 amountLeft = sub(inputData.availableAmount, txCost);

        inputData.feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);

        emit ActionEvent("GasFeeTaker", abi.encode(inputData, amountLeft));
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
