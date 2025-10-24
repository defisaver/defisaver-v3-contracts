// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Helper action to pull a token from the specified address
contract PullToken is ActionBase {
    using TokenUtils for address;

    /// @param tokenAddr Address of the token to pull
    /// @param from Address of the sender
    /// @param amount Amount of tokens to pull
    struct Params {
        address tokenAddr;
        address from;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.tokenAddr = _parseParamAddr(inputData.tokenAddr, _paramMapping[0], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[2], _subData, _returnValues);

        inputData.amount = _pullToken(inputData.tokenAddr, inputData.from, inputData.amount);

        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _pullToken(inputData.tokenAddr, inputData.from, inputData.amount);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Pulls a token from the specified addr, doesn't work with raw ETH.
    /// @notice If amount is type(uint).max it will send whole user's wallet balance.
    /// @param _tokenAddr Address of token
    /// @param _from From where the tokens are pulled
    /// @param _amount Amount of tokens, can be type(uint).max
    function _pullToken(address _tokenAddr, address _from, uint256 _amount) internal returns (uint256 amountPulled) {
        amountPulled = _tokenAddr.pullTokensIfNeeded(_from, _amount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
