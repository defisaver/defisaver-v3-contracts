// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;


import "../ActionBase.sol";
import "./helpers/GasFeeHelper.sol";

/// @title Calculated the amount of tokens needed for paying the tx fee without sending the amount
contract GasFeeCalc is ActionBase, GasFeeHelper {
    using TokenUtils for address;

    struct Params {
        uint256 gasUsed;
        address feeToken;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 txCost = calcGasCost(inputData.gasUsed, inputData.feeToken);

        return bytes32(txCost);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }


    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
