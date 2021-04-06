// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to pull a token from the specified address
contract PullToken is ActionBase {
    
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address tokenAddr, address from, uint amount) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);

        amount = _pullToken(tokenAddr, from, amount);

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable {
        (address tokenAddr, address from, uint amount) = parseInputs(_callData);

        _pullToken(tokenAddr, from, amount);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    

    /// @notice Pulls a token from the specified addr, doesn't work with ETH
    /// @dev If amount is type(uint).max it will send proxy balance
    /// @param _tokenAddr Address of token
    /// @param _from From where the tokens are pulled, can't be the proxy or 0x0
    /// @param _amount Amount of tokens, can be type(uint).max
    function _pullToken(address _tokenAddr, address _from, uint _amount) internal returns (uint) {
        _tokenAddr.pullTokensIfNeeded(_from, _amount);

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            address from,
            uint amount
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        from = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
    }
}
