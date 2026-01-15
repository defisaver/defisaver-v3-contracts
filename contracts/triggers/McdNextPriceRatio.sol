// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { McdRatioHelper } from "../actions/mcd/helpers/McdRatioHelper.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IMCDPriceVerifier } from "../interfaces/utils/IMCDPriceVerifier.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title Trigger contract that verifies if current MCD vault ratio is higher or lower than wanted
contract McdNextPriceRatio is ITrigger, AdminAuth, McdRatioHelper, CoreHelper, TriggerHelper {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

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

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        // Pass nextPrice = 0 to use the on-chain "next price" for this vault.
        // The trigger will then calculate the ratio using that next price.
        uint256 checkedRatio = getRatio(triggerSubData.vaultId, 0);

        // if cdp has 0 ratio don't trigger it
        if (checkedRatio == 0) return false;

        return shouldTrigger(triggerSubData.state, checkedRatio, triggerSubData.ratio);
    }

    function shouldTrigger(uint8 state, uint256 checkedRatio, uint256 subbedToRatio)
        internal
        pure
        returns (bool)
    {
        if (RatioState(state) == RatioState.OVER) {
            if (checkedRatio > subbedToRatio) return true;
        }
        if (RatioState(state) == RatioState.UNDER) {
            if (checkedRatio < subbedToRatio) return true;
        }

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
