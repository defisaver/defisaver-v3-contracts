// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { SkyHelper } from "./helpers/SkyHelper.sol";
import { IStakingRewards } from "../../interfaces/sky/IStakingRewards.sol";

/// @title Stake USDS via SKY for different rewards
contract SkyStake is ActionBase, SkyHelper {
    using TokenUtils for address;

    /// @param stakingContract address of the staking rewards contract
    /// @param stakingToken address of the token being staked
    /// @param amount amount of stakingToken to stake
    /// @param from address from which to pull stakingToken
    struct Params {
        address stakingContract;
        address stakingToken;
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

        inputData.stakingContract = _parseParamAddr(inputData.stakingContract, _paramMapping[0], _subData, _returnValues);
        inputData.stakingToken = _parseParamAddr(inputData.stakingToken, _paramMapping[1], _subData, _returnValues);
        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[3], _subData, _returnValues);

        (uint256 amountStaked, bytes memory logData) = _skyStake(inputData);
        emit ActionEvent("SkyStake", logData);
        return bytes32(amountStaked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyStake(inputData);
        logger.logActionDirectEvent("SkyStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyStake(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        _inputData.amount = _inputData.stakingToken.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        _inputData.stakingToken.approveToken(_inputData.stakingContract, _inputData.amount);
        IStakingRewards(_inputData.stakingContract).stake(_inputData.amount, SKY_REFERRAL_CODE);
        return (_inputData.amount, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
