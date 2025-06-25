// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityHelper } from "../helpers/LiquityHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action for borrowing LUSD tokens from Liquity
contract LiquityBorrow is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param maxFeePercentage Highest borrowing fee to accept, ranges between 0.5 and 5%
    /// @param lusdAmount Amount of LUSD tokens to borrow
    /// @param to Address that will receive the tokens
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 maxFeePercentage;   
        uint256 lusdAmount;         
        address to;                 
        address upperHint;
        address lowerHint;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.maxFeePercentage = _parseParamUint(
            params.maxFeePercentage,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.lusdAmount = _parseParamUint(
            params.lusdAmount,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 borrowedAmount, bytes memory logData) = _liquityBorrow(params);
        emit ActionEvent("LiquityBorrow", logData);
        return bytes32(borrowedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _liquityBorrow(params);
        logger.logActionDirectEvent("LiquityBorrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Increases the trove"s debt and withdraws minted LUSD tokens from the trove
    function _liquityBorrow(Params memory _params) internal returns (uint256, bytes memory) {
        BorrowerOperations.withdrawLUSD(
            _params.maxFeePercentage,
            _params.lusdAmount,
            _params.upperHint,
            _params.lowerHint
        );

        LUSD_TOKEN_ADDRESS.withdrawTokens(_params.to, _params.lusdAmount);


        bytes memory logData = abi.encode(_params.maxFeePercentage, _params.lusdAmount, _params.to);
        return (_params.lusdAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
