// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {AdminAuth} from "../auth/AdminAuth.sol";
import {ITrigger} from "../interfaces/ITrigger.sol";
import {TriggerHelper} from "./helpers/TriggerHelper.sol";
import {IAddressesRegistry} from "../interfaces/liquityV2/IAddressesRegistry.sol";
import {ITroveManager} from "../interfaces/liquityV2/ITroveManager.sol";

/// @title Trigger contract that verifies if current LiquityV2 position adjust time has passed for a given troveId
contract LiquityV2AdjustTimeTrigger is
ITrigger,
AdminAuth,
TriggerHelper
{

    /// @param market address of the market where the trove is
    /// @param troveId id of the trove
    struct SubParams {
        address market;
        uint256 troveId;
    }

    /// @dev checks if the adjust time has passed
    function isTriggered(bytes memory, bytes memory _subData)
    public
    override
    returns (bool)
    {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        return isAdjustTimePassed(triggerSubData.market, triggerSubData.troveId);
    }

    function isAdjustTimePassed(address _market, uint256 _troveId) public view returns (bool) {
        IAddressesRegistry market = IAddressesRegistry(_market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);

        uint currentTime = block.timestamp;
        // liquityV2 trove adjust time is 7 days
        uint sevenDaysInSeconds = 604_800;
        return currentTime > troveData.lastInterestRateAdjTime + sevenDaysInSeconds;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool){
        return false;
    }
}
