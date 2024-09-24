// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { SkyHelper } from "./helpers/SkyHelper.sol";
import { IStakingRewards } from "../../interfaces/sky/IStakingRewards.sol";

/// @title
contract SkyUnstake is ActionBase, SkyHelper {
    using TokenUtils for address;

    /// @param stakingContract
    /// @param stakingToken
    /// @param amount
    /// @param to 
    struct Params {
        address stakingContract;
        address stakingToken;
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

        inputData.stakingContract = _parseParamAddr(inputData.stakingContract, _paramMapping[0], _subData, _returnValues);
        inputData.stakingToken = _parseParamAddr(inputData.stakingToken, _paramMapping[1], _subData, _returnValues);
        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        (uint256 amountUnstaked, bytes memory logData) = _skyUnstake(inputData);
        emit ActionEvent("SkyUnstake", logData);
        return bytes32(amountUnstaked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyUnstake(inputData);
        logger.logActionDirectEvent("SkyUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyUnstake(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        if (_inputData.amount == type(uint256).max) _inputData.amount = _inputData.stakingContract.getBalance(address(this));
        IStakingRewards(_inputData.stakingContract).withdraw(_inputData.amount);
        _inputData.stakingToken.withdrawTokens(_inputData.to, _inputData.amount);
        return (_inputData.amount, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
