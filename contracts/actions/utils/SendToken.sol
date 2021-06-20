// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to send a token to the specified address
contract SendToken is ActionBase {

    using TokenUtils for address;

    struct Params {
        address tokenAddr;
        address to;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.tokenAddr = _parseParamAddr(inputData.tokenAddr, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[2], _subData, _returnValues);

        inputData.amount = _sendToken(inputData.tokenAddr, inputData.to, inputData.amount);

        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _sendToken(inputData.tokenAddr, inputData.to, inputData.amount);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    

    /// @notice Sends a token to the specified addr, works with Eth also
    /// @dev If amount is type(uint).max it will send proxy balance
    /// @param _tokenAddr Address of token, use 0xEeee... for eth
    /// @param _to Where the tokens are sent
    /// @param _amount Amount of tokens, can be type(uint).max
    function _sendToken(address _tokenAddr, address _to, uint _amount) internal returns (uint) {
        _tokenAddr.withdrawTokens(_to, _amount);

        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
