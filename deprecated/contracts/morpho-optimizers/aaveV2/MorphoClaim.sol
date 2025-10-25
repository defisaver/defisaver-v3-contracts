// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IRewardsDistributor } from "../../../interfaces/protocols/morpho/IRewardsDistributor.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { MorphoAaveV2Helper } from "./helpers/MorphoAaveV2Helper.sol";

/// @title Claims Morpho rewards for any address
contract MorphoClaim is ActionBase, MorphoAaveV2Helper {
    using TokenUtils for address;

    /// @param onBehalfOf address for which to claim
    /// @param claimable The overall claimable amount of token rewards
    /// @param proof The merkle proof which validates the claim
    struct Params {
        address onBehalfOf;
        uint256 claimable;
        bytes32[] proof;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.onBehalfOf = _parseParamAddr(params.onBehalfOf, _paramMapping[0], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _claim(params);
        emit ActionEvent("MorphoClaim", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params);
        logger.logActionDirectEvent("MorphoClaim", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _claim(Params memory _params) internal returns (uint256 claimed, bytes memory logData) {
        if (_params.onBehalfOf == address(0)) _params.onBehalfOf = address(this);

        uint256 alreadyClaimed = IRewardsDistributor(REWARDS_DISTRIBUTOR_ADDR).claimed(_params.onBehalfOf);
        IRewardsDistributor(REWARDS_DISTRIBUTOR_ADDR).claim(_params.onBehalfOf, _params.claimable, _params.proof);
        claimed = _params.claimable - alreadyClaimed;

        // The token initially deployed by the Morpho Association is non-transferable
        logData = abi.encode(_params, claimed);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
