// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { IGovernance } from "../../../interfaces/liquityV2/IGovernance.sol";

/// @title Stake LQTY for rewards and voting power
contract LiquityV2Stake is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    struct Params {
        uint256 lqtyAmountToStake;
        address from;
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

        params.lqtyAmountToStake = _parseParamUint(params.lqtyAmountToStake, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.rewardRecipient = _parseParamAddr(params.rewardRecipient, _paramMapping[2], _subData, _returnValues);

        (uint256 stakedAmount, bytes memory logData) = _stake(params);
        emit ActionEvent("LiquityV2Stake", logData);
        return bytes32(stakedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _stake(params);
        logger.logActionDirectEvent("LiquityV2Stake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _stake(Params memory _params) internal returns (uint256, bytes memory) {
        _params.lqtyAmountToStake = LQTY_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lqtyAmountToStake);
        address userProxy = IGovernance(GOVERNANCE).deriveUserProxyAddress(address(this));
        LQTY_TOKEN_ADDRESS.approveToken(userProxy, _params.lqtyAmountToStake);
        IGovernance(GOVERNANCE).depositLQTY(_params.lqtyAmountToStake, true, _params.rewardRecipient);

        return (_params.lqtyAmountToStake, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
