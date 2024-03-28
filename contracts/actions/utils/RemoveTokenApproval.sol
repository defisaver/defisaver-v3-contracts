// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/SafeERC20.sol";
import "../ActionBase.sol";

/// @title Helper action to remove token approval given to a spender
contract RemoveTokenApproval is ActionBase {

    using SafeERC20 for IERC20;

    struct Params {
        address tokenAddr;
        address spender;
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

        _removeApproval(inputData.tokenAddr, inputData.spender);

        emit ActionEvent("RemoveTokenApproval", abi.encode(inputData));
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _removeApproval(inputData.tokenAddr, inputData.spender);
        logger.logActionDirectEvent("RemoveTokenApproval", abi.encode(inputData));
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////
    

    /// @notice Remove approval for spender to pull tokens from user wallet
    /// @param _tokenAddr Address of token
    /// @param _spender Address of the spender
    function _removeApproval(address _tokenAddr, address _spender) internal {
        IERC20(_tokenAddr).safeApprove(_spender, 0);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
