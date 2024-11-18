// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IMorphoTokenWrapper } from "../../interfaces/morpho-blue/IMorphoTokenWrapper.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { MorphoBlueHelper } from "./helpers/MorphoBlueHelper.sol";

/// @title Wraps Legacy MORPHO token to new Wrapped MORPHO token
contract MorphoTokenWrap is ActionBase, MorphoBlueHelper {
    using TokenUtils for address;

    /// @param to The address to which to send the new Wrapped MORPHO tokens
    /// @param amount The amount of Legacy MORPHO tokens to wrap, if type(uint256).max wraps whole wallet balance
    struct Params {
        address to;
        uint256 amount;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _wrap(params);
        emit ActionEvent("MorphoTokenWrap", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _wrap(params);
        logger.logActionDirectEvent("MorphoTokenWrap", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _wrap(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.amount == type(uint256).max) {
            _params.amount = LEGACY_MORPHO_TOKEN.getBalance(address(this));
        }

        LEGACY_MORPHO_TOKEN.approveToken(MORPHO_TOKEN_WRAPPER, _params.amount);

        IMorphoTokenWrapper(MORPHO_TOKEN_WRAPPER).depositFor(
            _params.to, 
            _params.amount
        );

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}