// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract LiquityBorrow is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 maxFeePercentage;   // Highest borrowing fee to accept, ranges between 0.5 and 5%
        uint256 lusdAmount;         // Amount of LUSD tokens to borrow
        address to;                 // Address that will receive the tokens
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

        params.lusdAmount = _liquityBorrow(params);
        return bytes32(params.lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquityBorrow(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Increases the trove"s debt and withdraws minted LUSD tokens from the trove
    function _liquityBorrow(Params memory params) internal returns (uint256) {
        BorrowerOperations.withdrawLUSD(
            params.maxFeePercentage,
            params.lusdAmount,
            params.upperHint,
            params.lowerHint
        );

        LUSDTokenAddr.withdrawTokens(params.to, params.lusdAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityBorrow",
            abi.encode(params.maxFeePercentage, params.lusdAmount, params.to)
        );

        return params.lusdAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
