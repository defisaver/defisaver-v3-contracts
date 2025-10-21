// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { ILockstakeEngine } from "../../interfaces/sky/ILockstakeEngine.sol";

/// @title Unstake SKY tokens from previously staked position
contract SkyStakingEngineUnstake is ActionBase {
    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param amount amount of stakingToken to unstake
    /// @param to address to which to send stakingToken
    struct Params {
        address stakingContract;
        uint256 index;
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

        inputData.stakingContract =
            _parseParamAddr(inputData.stakingContract, _paramMapping[0], _subData, _returnValues);
        inputData.index = _parseParamUint(inputData.index, _paramMapping[1], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[2], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        (uint256 amountUnstaked, bytes memory logData) = _skyUnstakeFromStakingEngine(inputData);
        emit ActionEvent("SkyStakingEngineUnstake", logData);
        return bytes32(amountUnstaked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyUnstakeFromStakingEngine(inputData);
        logger.logActionDirectEvent("SkyStakingEngineUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyUnstakeFromStakingEngine(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        uint256 freed = ILockstakeEngine(_inputData.stakingContract)
            .free(address(this), _inputData.index, _inputData.to, _inputData.amount);
        return (freed, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
