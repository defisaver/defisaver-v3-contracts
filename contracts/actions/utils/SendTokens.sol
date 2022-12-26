// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to send tokens to the specified addresses
contract SendTokens is ActionBase {

    using TokenUtils for address;

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
        
        for (uint256 i = 0; i < arrayLength;) {
            inputData.tokens[i] = _parseParamAddr(inputData.tokens[i], _paramMapping[i], _subData, _returnValues);
            inputData.receivers[i] = _parseParamAddr(inputData.receivers[i], _paramMapping[arrayLength + i], _subData, _returnValues);
            inputData.amounts[i] = _parseParamUint(inputData.amounts[i], _paramMapping[2 * arrayLength + i], _subData, _returnValues);

            unchecked { ++i; }
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
    function _sendTokens(Params memory _inputData, uint256 arrayLength) internal {
        for (uint256 i = 0; i < arrayLength;) {
            _inputData.tokens[i].withdrawTokens(_inputData.receivers[i], _inputData.amounts[i]);

            unchecked { ++i; }
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params, uint256 arrayLength) {
        params = abi.decode(_callData, (Params));
        require(params.tokens.length == params.receivers.length);
        require(params.tokens.length == params.amounts.length);
        arrayLength = params.tokens.length;
    }
}
