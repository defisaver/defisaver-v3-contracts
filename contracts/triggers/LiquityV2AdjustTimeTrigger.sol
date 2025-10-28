// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IAddressesRegistry } from "../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../interfaces/protocols/liquityV2/ITroveManager.sol";
import { IBorrowerOperations } from "../interfaces/protocols/liquityV2/IBorrowerOperations.sol";

import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Trigger contract that verifies if current LiquityV2 position adjust time for interest rate has passed.
/// @dev If the trove has an interest batch manager, the trigger will not be triggered.
/// @dev If the trove is not active, the trigger will not be triggered.
contract LiquityV2AdjustTimeTrigger is ITrigger, AdminAuth, TriggerHelper {
    uint256 constant INTEREST_RATE_ADJ_COOLDOWN = 7 days;

    /// @param market address of the market where the trove is
    /// @param troveId id of the trove
    struct SubParams {
        address market;
        uint256 troveId;
    }

    /// @dev checks if the adjust time has passed
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        return isAdjustmentFeeZero(triggerSubData.market, triggerSubData.troveId);
    }

    function isAdjustmentFeeZero(address _market, uint256 _troveId) public view returns (bool) {
        IAddressesRegistry market = IAddressesRegistry(_market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        IBorrowerOperations borrowerOperations = IBorrowerOperations(market.borrowerOperations());

        // return false if trove has an interest batch manager
        if (borrowerOperations.interestBatchManagerOf(_troveId) != address(0)) {
            return false;
        }

        // return false if trove is not active
        if (troveManager.getTroveStatus(_troveId) != ITroveManager.Status.active) {
            return false;
        }

        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);

        return block.timestamp >= troveData.lastInterestRateAdjTime + INTEREST_RATE_ADJ_COOLDOWN;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
