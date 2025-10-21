// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { SkyHelper } from "./helpers/SkyHelper.sol";
import { ILockstakeEngine } from "../../interfaces/sky/ILockstakeEngine.sol";

/// @title Stake SKY token via SKY protocol for different rewards
contract SkyStakingEngineStake is ActionBase, SkyHelper {
    using TokenUtils for address;

    /// @param stakingContract address of the staking engine contract
    /// @param index index of the urn
    /// @param amount amount of stakingToken to stake
    /// @param from address from which to pull stakingToken
    struct Params {
        address stakingContract;
        uint256 index;
        uint256 amount;
        address from;
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
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[3], _subData, _returnValues);

        (uint256 amountStaked, bytes memory logData) = _skyStakeInStakingEngine(inputData);
        emit ActionEvent("SkyStakingEngineStake", logData);
        return bytes32(amountStaked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyStakeInStakingEngine(inputData);
        logger.logActionDirectEvent("SkyStakingEngineStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyStakeInStakingEngine(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        _inputData.amount = SKY_ADDRESS.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        SKY_ADDRESS.approveToken(_inputData.stakingContract, _inputData.amount);
        ILockstakeEngine(_inputData.stakingContract)
            .lock(address(this), _inputData.index, _inputData.amount, SKY_REFERRAL_CODE);

        return (_inputData.amount, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
