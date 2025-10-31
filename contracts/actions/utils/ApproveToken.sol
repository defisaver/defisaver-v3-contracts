// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Helper action to approve spender to pull an amount of tokens from user's wallet
contract ApproveToken is ActionBase {
    using TokenUtils for address;

    /// @param tokenAddr Address of token to approve
    /// @param spender Address of the spender
    /// @param amount Amount of tokens to approve
    struct Params {
        address tokenAddr;
        address spender;
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

        inputData.tokenAddr =
            _parseParamAddr(inputData.tokenAddr, _paramMapping[0], _subData, _returnValues);
        inputData.spender =
            _parseParamAddr(inputData.spender, _paramMapping[1], _subData, _returnValues);
        inputData.amount =
            _parseParamUint(inputData.amount, _paramMapping[2], _subData, _returnValues);

        _approveToken(inputData.tokenAddr, inputData.spender, inputData.amount);

        emit ActionEvent("ApproveToken", abi.encode(inputData));
        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _approveToken(inputData.tokenAddr, inputData.spender, inputData.amount);
        logger.logActionDirectEvent("ApproveToken", abi.encode(inputData));
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Approves an amount of tokens for spender to pull from user's wallet
    /// @param _tokenAddr Address of token
    /// @param _spender Address of the spender
    /// @param _amount Amount of tokens, can be type(uint).max
    function _approveToken(address _tokenAddr, address _spender, uint256 _amount) internal {
        _tokenAddr.approveToken(_spender, _amount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
