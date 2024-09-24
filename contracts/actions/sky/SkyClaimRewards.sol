// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { SkyHelper } from "./helpers/SkyHelper.sol";
import { IStakingRewards } from "../../interfaces/sky/IStakingRewards.sol";

/// @title Claim rewards earned by staking USDS on SKY
contract SkyClaimRewards is ActionBase, SkyHelper {
    using TokenUtils for address;

    /// @param stakingContract address of the staking rewards contract
    /// @param rewardToken address of the token given out as reward
    /// @param to address which will receive rewardToken
    struct Params {
        address stakingContract;
        address rewardToken;
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
        inputData.rewardToken = _parseParamAddr(inputData.rewardToken, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        (uint256 amountClaimed, bytes memory logData) = _skyClaimRewards(inputData);
        emit ActionEvent("SkyClaimRewards", logData);
        return bytes32(amountClaimed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _skyClaimRewards(inputData);
        logger.logActionDirectEvent("SkyClaimRewards", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _skyClaimRewards(Params memory _inputData) internal returns (uint256, bytes memory logData) {
        require(_inputData.rewardToken != address(0));
        uint256 startingBalance = _inputData.rewardToken.getBalance(address(this));
        IStakingRewards(_inputData.stakingContract).getReward();
        uint256 amountClaimed = _inputData.rewardToken.getBalance(address(this)) - startingBalance;
        _inputData.rewardToken.withdrawTokens(_inputData.to, amountClaimed);
        return (amountClaimed, abi.encode(_inputData));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
