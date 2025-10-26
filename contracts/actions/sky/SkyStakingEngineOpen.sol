// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { ILockstakeEngine } from "../../interfaces/protocols/sky/ILockstakeEngine.sol";

/// @title Create position via LockstakeEngine
contract SkyStakingEngineOpen is ActionBase {
    /// @param stakingContract address of the staking engine contract
    struct Params {
        address stakingContract;
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

        (uint256 index, bytes memory logData) = _skyOpenInStakingEngine(inputData);
        emit ActionEvent("SkyStakingEngineOpen", logData);
        return bytes32(index);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyOpenInStakingEngine(inputData);
        logger.logActionDirectEvent("SkyStakingEngineOpen", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyOpenInStakingEngine(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        uint256 index = ILockstakeEngine(_inputData.stakingContract).ownerUrnsCount(address(this));
        ILockstakeEngine(_inputData.stakingContract).open(index);
        return (index, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
