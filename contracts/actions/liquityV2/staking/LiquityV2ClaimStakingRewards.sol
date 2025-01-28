// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { IGovernance } from "../../../interfaces/liquityV2/IGovernance.sol";

/// @title Claim rewards gained from LQTY staking
contract LiquityV2ClaimStakingRewards is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    struct Params {
        address rewardRecipient;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.rewardRecipient = _parseParamAddr(params.rewardRecipient, _paramMapping[0], _subData, _returnValues);

        (, bytes memory logData) = _claimRewards(params);
        emit ActionEvent("LiquityV2StakingClaimRewards", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claimRewards(params);
        logger.logActionDirectEvent("LiquityV2StakingClaimRewards", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _claimRewards(Params memory _params) internal returns (uint256, bytes memory) {
        (uint256 lusdSent, uint256 ethSent) = IGovernance(GOVERNANCE).claimFromStakingV1(_params.rewardRecipient);

        return (0, abi.encode(_params, lusdSent, ethSent));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
