// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { ILockstakeEngine } from "../../interfaces/protocols/sky/ILockstakeEngine.sol";
import { SkyHelper } from "./helpers/SkyHelper.sol";

/// @title Selects a farm for the SKY Staking Engine Position
contract SkyStakingEngineSelectFarm is ActionBase, SkyHelper {
    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param farm address of farm to select
    struct Params {
        address stakingContract;
        uint256 index;
        address farm;
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
        inputData.farm = _parseParamAddr(inputData.farm, _paramMapping[2], _subData, _returnValues);

        (address farm, bytes memory logData) = _skyStakingEngineSelectFarm(inputData);
        emit ActionEvent("SkyStakingEngineSelectFarm", logData);
        return bytes32(bytes20(farm));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyStakingEngineSelectFarm(inputData);
        logger.logActionDirectEvent("SkyStakingEngineSelectFarm", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyStakingEngineSelectFarm(Params memory _inputData) internal returns (address, bytes memory logData) {
        ILockstakeEngine(_inputData.stakingContract)
            .selectFarm(address(this), _inputData.index, _inputData.farm, SKY_REFERRAL_CODE);
        return (_inputData.farm, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
