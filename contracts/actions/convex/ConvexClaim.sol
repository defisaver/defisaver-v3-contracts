// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IBRewardPool } from "../../interfaces/convex/IBRewardPool.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ConvexHelper } from "./helpers/ConvexHelper.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Action that claims Convex rewards.
contract ConvexClaim is ConvexHelper, ActionBase {
    using TokenUtils for address;

    /// @param from address for which to claim rewards
    /// @param to address that will receive the rewards
    /// @param rewardContract Address of the reward contract
    struct Params {
        address from;
        address to;
        address rewardContract;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.rewardContract = _parseParamAddr(params.rewardContract, _paramMapping[2], _subData, _returnValues);
        
        (uint256 crvEarned, bytes memory logData) = _claim(params);
        emit ActionEvent("ConvexClaim", logData);
        return bytes32(crvEarned);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("ConvexClaim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _claim(Params memory _params) internal returns (uint256 crvEarned, bytes memory logData) {
        Reward[] memory rewards = _earnedRewards(_params.from, _params.rewardContract);
        IBRewardPool(_params.rewardContract).getReward(_params.from, true);

        crvEarned = _transferRewards(_params.from, _params.to, rewards);
        logData = abi.encode(_params, rewards);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}