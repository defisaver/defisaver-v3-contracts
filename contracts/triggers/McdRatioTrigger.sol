// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../actions/mcd/helpers/McdRatioHelper.sol";
import "../interfaces/ITrigger.sol";
import "../core/helpers/CoreHelper.sol";
import "../core/DFSRegistry.sol";
import "./helpers/TriggerHelper.sol";


/// @title Trigger contract that verifies if current MCD vault ratio is higher or lower than wanted
contract McdRatioTrigger is ITrigger, AdminAuth, McdRatioHelper, CoreHelper, TriggerHelper {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    enum RatioState {
        OVER,
        UNDER
    }

    /// @param vaultId id of the vault whose ratio we check
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want current ratio to be higher or lower than ratio param
    struct SubParams {
        uint256 vaultId;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory _callData, bytes memory _subData)
        public
        override
        returns (bool)
    {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 checkedRatio;
    
        checkedRatio = getRatio(triggerSubData.vaultId);

        // if cdp has 0 ratio don't trigger it
        if (checkedRatio == 0) return false;

        return shouldTrigger(triggerSubData.state, checkedRatio, triggerSubData.ratio);

    }
    
    function shouldTrigger(uint8 state, uint256 checkedRatio, uint256 subbedToRatio) internal pure returns (bool){
        if (RatioState(state) == RatioState.OVER) {
            if (checkedRatio > subbedToRatio) return true;
        }
        if (RatioState(state) == RatioState.UNDER) {
            if (checkedRatio < subbedToRatio) return true;
        }

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
