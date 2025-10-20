// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IUmbrellaRewardsController } from "../../../interfaces/aaveV3/IUmbrellaRewardsController.sol";
import { ActionBase } from "../../ActionBase.sol";
import { AaveV3Helper } from "../helpers/AaveV3Helper.sol";

/// @title UmbrellaClaimRewards - Claim rewards from staking in Umbrella staking system
contract UmbrellaClaimRewards is ActionBase, AaveV3Helper {
    /// @param asset The asset to claim rewards from
    /// @param to The address to send the rewards to
    /// @param rewards The rewards to claim
    struct Params {
        address asset;
        address to;
        address[] rewards;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.asset = _parseParamAddr(params.asset, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256[] memory amounts, bytes memory logData) = _claimRewards(params);
        emit ActionEvent("UmbrellaClaimRewards", logData);
        return bytes32(amounts[0]);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claimRewards(params);
        logger.logActionDirectEvent("UmbrellaClaimRewards", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _claimRewards(Params memory _params) internal returns (uint256[] memory, bytes memory) {
        IUmbrellaRewardsController rewardsController = IUmbrellaRewardsController(UMBRELLA_REWARDS_CONTROLLER_ADDRESS);

        uint256[] memory amounts = rewardsController.claimSelectedRewards(_params.asset, _params.rewards, _params.to);

        return (amounts, abi.encode(_params, amounts));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
