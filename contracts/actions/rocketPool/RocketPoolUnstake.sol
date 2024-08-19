// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { DSMath } from "../../DS/DSMath.sol";
import { RocketPoolHelper } from "./helpers/RocketPoolHelper.sol";
import { IRethToken } from "../../interfaces/rocketPool/IRethToken.sol";

/// @title Burns rETH amount, receives underlying ETH in return
contract RocketPoolUnstake is  ActionBase, DSMath, RocketPoolHelper {
    using TokenUtils for address;

    /// @param amount - amount of rETH to burn
    /// @param to - address where received ETH will be sent to
    struct Params {
        uint256 amount;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);

        (uint256 ethReceivedAmount, bytes memory logData) = _rocketPoolUnstake(inputData);
        emit ActionEvent("RocketPoolUnstake", logData);
        return bytes32(ethReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _rocketPoolUnstake(inputData);
        logger.logActionDirectEvent("RocketPoolUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice burns rETH amount and send underlying ETH to target address
    function _rocketPoolUnstake(Params memory _inputData) internal returns (uint256 ethReceivedAmount, bytes memory logData) {
        if (_inputData.amount == type(uint256).max) {
            _inputData.amount = IRethToken(RETH).balanceOf(address(this));
        }

        uint256 ethBalanceBefore = address(this).balance;
        
        IRethToken(RETH).burn(_inputData.amount);
        
        uint256 ethBalanceAfter = address(this).balance;

        ethReceivedAmount = ethBalanceAfter - ethBalanceBefore;
        logData = abi.encode(_inputData, ethReceivedAmount);

        TokenUtils.ETH_ADDR.withdrawTokens(_inputData.to, ethReceivedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
