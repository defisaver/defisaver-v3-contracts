// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/ReflexerHelper.sol";
import "../../utils/TokenUtils.sol";

/// @title Withdraw RAI/WETH UniV2 LP tokens that were used for safe protection
contract ReflexerSaviourWithdraw is ActionBase, ReflexerHelper {

    /// @param to - address to which the withdrawn LP tokens will be sent to
    /// @param safeId - ID of the SAFE
    /// @param lpTokenAmount - amount of LP tokens to withdraw
    /// @param saviour - address of the saviour contract where the LP tokens were deposited to
    struct Params {
        address to;
        uint256 safeId;
        uint256 lpTokenAmount;
        address saviour;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[0], _subData, _returnValues);
        inputData.lpTokenAmount = _parseParamUint(
            inputData.lpTokenAmount,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        
        _reflexerSaviourWithdraw(inputData);
        return bytes32(inputData.lpTokenAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _reflexerSaviourWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _reflexerSaviourWithdraw(Params memory _inputData) internal {
        ISAFESaviour(_inputData.saviour).withdraw(_inputData.safeId, _inputData.lpTokenAmount, _inputData.to);
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}