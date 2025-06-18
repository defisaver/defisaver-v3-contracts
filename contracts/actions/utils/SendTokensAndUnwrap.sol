// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Helper action to send tokens to the specified addresses and unwrap for weth address
contract SendTokensAndUnwrap is ActionBase {

    using TokenUtils for address;

    error ArraysLengthMismatchError();

    /// @param tokens list of tokens to send
    /// @param receivers list of addresses that will receive corresponding tokens
    /// @param amounts list of amounts of corresponding tokens that will be sent
    struct Params {
        address[] tokens;
        address[] receivers;
        uint256[] amounts;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        (Params memory inputData, uint256 arrayLength) = parseInputs(_callData);

        for (uint256 i = 0; i < arrayLength; ++i) {
            inputData.tokens[i] = _parseParamAddr(inputData.tokens[i], _paramMapping[i], _subData, _returnValues);
            inputData.receivers[i] = _parseParamAddr(inputData.receivers[i], _paramMapping[arrayLength + i], _subData, _returnValues);
            inputData.amounts[i] = _parseParamUint(inputData.amounts[i], _paramMapping[2 * arrayLength + i], _subData, _returnValues);
        }

        _sendTokens(inputData, arrayLength);

        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        (Params memory inputData, uint256 arrayLength) = parseInputs(_callData);

        _sendTokens(inputData, arrayLength);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Sends tokens to the specified addresses, works with Eth also
    /// @notice If token is weth address, it will unwrap by default
    /// @notice If amount is type(uint).max it will send whole users' wallet balance
    function _sendTokens(Params memory _inputData, uint256 arrayLength) internal {
        for (uint256 i = 0; i < arrayLength; ++i) {
            if (_inputData.amounts[i] == type(uint256).max) {
                _inputData.amounts[i] = _inputData.tokens[i].getBalance(address(this));
            }
            // unwrap and send eth if token is weth
            if (_inputData.tokens[i] == TokenUtils.WETH_ADDR) {
                TokenUtils.withdrawWeth(_inputData.amounts[i]);
                _inputData.tokens[i] = TokenUtils.ETH_ADDR;
            }
            _inputData.tokens[i].withdrawTokens(_inputData.receivers[i], _inputData.amounts[i]);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params, uint256 arrayLength) {
        params = abi.decode(_callData, (Params));
        arrayLength = params.tokens.length;
        if (arrayLength != params.receivers.length || arrayLength != params.amounts.length) {
            revert ArraysLengthMismatchError();
        }
    }
}
