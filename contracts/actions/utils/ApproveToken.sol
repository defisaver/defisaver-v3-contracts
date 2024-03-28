// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to approve spender to pull an amount of tokens from user's wallet
contract ApproveToken is ActionBase {

    using TokenUtils for address;

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
    ) public virtual payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.tokenAddr = _parseParamAddr(inputData.tokenAddr, _paramMapping[0], _subData, _returnValues);
        inputData.spender = _parseParamAddr(inputData.spender, _paramMapping[1], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[2], _subData, _returnValues);

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
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    

    /// @notice Approves an amount of tokens for spender to pull from user's wallet
    /// @param _tokenAddr Address of token
    /// @param _spender Address of the spender
    /// @param _amount Amount of tokens, can be type(uint).max
    function _approveToken(address _tokenAddr, address _spender, uint _amount) internal {
        _tokenAddr.approveToken(_spender, _amount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
