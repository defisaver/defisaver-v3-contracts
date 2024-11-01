// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IRewardsToken } from "../../interfaces/eulerV2/IRewardsToken.sol";

/// @title Claim EulerV2 rewards
contract EulerV2ClaimRewards is ActionBase, EulerV2Helper {
    using TokenUtils for address;

    /// @param to Where to send claimed tokens
    /// @param claimAll Whether to claim rewards from all timestamp locks
    /// @param allowRemainderLoss Whether to allow loss of remainder tokens. If false, if there is some remainder, tx will revert on EulerV2
    /// @param lockTimestamps The timestamps of the locks to claim rewards from. Only used if claimAll is false
    struct Params {
        address to;
        bool claimAll;
        bool allowRemainderLoss;
        uint256[] lockTimestamps;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);
        params.claimAll = _parseParamUint(params.claimAll ? 1 : 0, _paramMapping[1], _subData, _returnValues) == 1;
        params.allowRemainderLoss = _parseParamUint(
            params.allowRemainderLoss ? 1 : 0,
            _paramMapping[2],
            _subData,
            _returnValues
        ) == 1;

        (uint256 claimedAmount, bytes memory logData) = _claimRewards(params);
        emit ActionEvent("EulerV2ClaimRewards", logData);
        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claimRewards(params);
        logger.logActionDirectEvent("EulerV2ClaimRewards", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _claimRewards(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.claimAll) {
            (_params.lockTimestamps,) = IRewardsToken(REWARDS_EUL_TOKEN).getLockedAmounts(address(this));
        }

        address token = IRewardsToken(REWARDS_EUL_TOKEN).underlying();

        uint256 balanceBefore = token.getBalance(address(this));

        IRewardsToken(REWARDS_EUL_TOKEN).withdrawToByLockTimestamps(
            address(this),
            _params.lockTimestamps,
            _params.allowRemainderLoss
        );

        uint256 claimedAmount = token.getBalance(address(this)) - balanceBefore;

        token.withdrawTokens(_params.to, claimedAmount);

        return (claimedAmount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}