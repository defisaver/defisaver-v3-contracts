// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to send a token to the specified address
contract SendToken is ActionBase {

    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        (address tokenAddr, address to, uint amount) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);

        amount = _sendToken(tokenAddr, to, amount);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (address tokenAddr, address to, uint amount) = parseInputs(_callData);

        _sendToken(tokenAddr, to, amount);
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

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            address to,
            uint amount
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        to = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
    }
}
