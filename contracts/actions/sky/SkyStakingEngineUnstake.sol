// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ActionBase} from "../ActionBase.sol";
import {TokenUtils} from "../../utils/TokenUtils.sol";
import {SkyHelper} from "./helpers/SkyHelper.sol";
import {IStakingRewards} from "../../interfaces/sky/IStakingRewards.sol";
import {ILockstakeEngine} from "../../interfaces/sky/ILockstakeEngine.sol";

// TODO -> remove USDS part
/// @title Unstake SKY tokens from previously staked position
contract SkyStakingEngineUnstake is ActionBase, SkyHelper {
    using TokenUtils for address;

    /// @param stakingContract address of the staking engine contract
    /// @param amount amount of stakingToken to unstake
    /// @param index index of the urn
    /// @param to address to which to send stakingToken
    struct Params {
        address stakingContract;
        uint256 amount;
        uint256 index;
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
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.index = _parseParamUint(inputData.index, _paramMapping[2], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        (uint256 amountStaked, bytes memory logData) = _skyUnstakeFromStakingEngine(inputData);
        emit ActionEvent("SkyStakingEngine", logData);
        return bytes32(amountStaked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyUnstakeFromStakingEngine(inputData);
        logger.logActionDirectEvent("SkyStakingEngine", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyUnstakeFromStakingEngine(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        ILockstakeEngine(_inputData.stakingContract).free(
            address(this), _inputData.index, _inputData.to, _inputData.amount
        );
        return (_inputData.amount, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
