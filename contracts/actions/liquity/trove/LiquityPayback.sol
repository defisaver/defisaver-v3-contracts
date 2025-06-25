// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityHelper } from "../helpers/LiquityHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action for repaying LUSD tokens to Liquity Trove
contract LiquityPayback is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param lusdAmount Amount of LUSD tokens to repay
    /// @param from Address where to pull the tokens from
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 lusdAmount; 
        address from;       
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

        params.lusdAmount = _parseParamUint(
            params.lusdAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        (uint256 repayAmount, bytes memory logData) = _liquityPayback(params);
        emit ActionEvent("LiquityPayback", logData);
        return bytes32(repayAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquityPayback(params);
        logger.logActionDirectEvent("LiquityPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Repays LUSD tokens to the trove
    /// @notice Trove after payback can't have debt less than MIN_DEBT (2000e18)
    function _liquityPayback(Params memory _params) internal returns (uint256, bytes memory) {
        uint256 lusdAmountPulled = LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lusdAmount);
        uint256 wholeDebt = TroveManager.getTroveDebt(address(this));

        uint256 paybackAmount = lusdAmountPulled;

        // If when we repay the position the trove debt is below MIN_DEBT, we repay to the minimum debt allowed
        if (wholeDebt < (lusdAmountPulled + MIN_DEBT) && _params.lusdAmount == type(uint256).max){
            paybackAmount = wholeDebt - MIN_DEBT;
            LUSD_TOKEN_ADDRESS.withdrawTokens(_params.from, (lusdAmountPulled - paybackAmount));
        }

        BorrowerOperations.repayLUSD(paybackAmount, _params.upperHint, _params.lowerHint);

        bytes memory logData = abi.encode(paybackAmount, _params.from);
        return (paybackAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
