// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityHelper } from "../helpers/LiquityHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action for withdrawing collateral from Liquity Trove
contract LiquityWithdraw is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param collAmount Amount of WETH tokens to withdraw
    /// @param to Address that will receive the tokens
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        uint256 collAmount; 
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

        params.collAmount = _parseParamUint(
            params.collAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _liquityWithdraw(params);
        emit ActionEvent("LiquityWithdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquityWithdraw(params);
        logger.logActionDirectEvent("LiquityWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws collateral from the trove
    function _liquityWithdraw(Params memory _params) internal returns (uint256, bytes memory) {
        BorrowerOperations.withdrawColl(_params.collAmount, _params.upperHint, _params.lowerHint);

        TokenUtils.depositWeth(_params.collAmount);
        TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.collAmount);

        bytes memory logData = abi.encode(_params.collAmount, _params.to);
        return (_params.collAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
