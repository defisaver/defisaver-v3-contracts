// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { McdRatioHelper } from "../actions/mcd/helpers/McdRatioHelper.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { IMCDPriceVerifier } from "../interfaces/IMCDPriceVerifier.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";

/// @title Trigger contract that verifies if current MCD vault ratio is higher or lower than wanted
contract McdRatioTrigger is ITrigger, AdminAuth, McdRatioHelper, CoreHelper, TriggerHelper {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    error WrongNextPrice(uint256);

    enum RatioState {
        OVER,
        UNDER
    }

    enum RatioCheck {
        CURR_RATIO,
        NEXT_RATIO,
        BOTH_RATIOS
    }

    /// @param nextPrice price that OSM returns as next price value
    /// @param ratioCheck returns if we want the trigger to look at the current asset price, nextPrice param or both
    struct CallParams {
        uint256 nextPrice;
        uint8 ratioCheck;
    }

    /// @param vaultId id of the vault whose ratio we check
    /// @param ratio ratio that represents the triggerable point
    /// @param state represents if we want current ratio to be higher or lower than ratio param
    struct SubParams {
        uint256 vaultId;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory _callData, bytes memory _subData) public view override returns (bool) {
        CallParams memory triggerCallData = parseCallInputs(_callData);
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 checkedRatio;
        bool shouldTriggerCurr;
        bool shouldTriggerNext;

        if (
            RatioCheck(triggerCallData.ratioCheck) == RatioCheck.CURR_RATIO
                || RatioCheck(triggerCallData.ratioCheck) == RatioCheck.BOTH_RATIOS
        ) {
            checkedRatio = getRatio(triggerSubData.vaultId, 0);

            // if cdp has 0 ratio don't trigger it
            if (checkedRatio == 0) return false;

            shouldTriggerCurr = shouldTrigger(triggerSubData.state, checkedRatio, triggerSubData.ratio);
        }

        if (
            RatioCheck(triggerCallData.ratioCheck) == RatioCheck.NEXT_RATIO
                || RatioCheck(triggerCallData.ratioCheck) == RatioCheck.BOTH_RATIOS
        ) {
            checkedRatio = getRatio(triggerSubData.vaultId, triggerCallData.nextPrice);

            // if cdp has 0 ratio don't trigger it
            if (checkedRatio == 0) return false;

            shouldTriggerNext = shouldTrigger(triggerSubData.state, checkedRatio, triggerSubData.ratio);

            // must convert back to wad
            if (triggerCallData.nextPrice != 0) {
                triggerCallData.nextPrice = triggerCallData.nextPrice / 1e9;
            }

            /// @dev if we don't have access to the next price on-chain this returns true, if we do this compares the nextPrice param we sent
            if (
                !IMCDPriceVerifier(MCD_PRICE_VERIFIER).verifyVaultNextPrice(
                    triggerCallData.nextPrice, triggerSubData.vaultId
                )
            ) {
                revert WrongNextPrice(triggerCallData.nextPrice);
            }
        }

        return shouldTriggerCurr || shouldTriggerNext;
    }

    function shouldTrigger(uint8 state, uint256 checkedRatio, uint256 subbedToRatio) internal pure returns (bool) {
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

    function parseCallInputs(bytes memory _callData) internal pure returns (CallParams memory params) {
        params = abi.decode(_callData, (CallParams));
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
