// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";

import { LiquityV2Helper } from "../actions/liquityV2/helpers/LiquityV2Helper.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Trigger contract that triggers if calculated debt in front of a trove is below a certain threshold
/// @notice This trigger takes all the branches into account
contract LiquityV2DebtInFrontTrigger is ITrigger, AdminAuth, TriggerHelper, LiquityV2Helper {
    /// @param market address of the market
    /// @param troveId id of the trove
    /// @param debtInFrontMin minimum debt in front, below which the trigger will be triggered
    struct SubParams {
        address market;
        uint256 troveId;
        uint256 debtInFrontMin;
    }

    /// @notice Checks if the debt in front of the trove is below the minimum debt in front
    /// @param _subData bytes encoded SubParams struct
    /// @return bool true if the debt in front of the trove is below the minimum debt in front
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 debtInFront = getDebtInFront(triggerSubData.market, triggerSubData.troveId);

        return debtInFront < triggerSubData.debtInFrontMin;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
