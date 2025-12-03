// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../interfaces/protocols/aaveV4/ISpoke.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { TransientStorageCancun } from "../utils/transient/TransientStorageCancun.sol";
import { TriggerHelper } from "./helpers/TriggerHelper.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title AaveV4RatioTrigger
/// @notice Triggers when the user's ratio is over/under a subbed ratio.
contract AaveV4RatioTrigger is ITrigger, AdminAuth, TriggerHelper {
    TransientStorageCancun public constant tempStorage =
        TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);

    enum RatioState {
        OVER,
        UNDER
    }

    /// @param user Address of the user.
    /// @param spoke Address of the aaveV4 spoke.
    /// @param ratio Ratio that represents the triggerable point.
    /// @param state Represents if we want the current state to be higher or lower than ratio param.
    struct SubParams {
        address user;
        address spoke;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory, bytes memory _subData) external override returns (bool) {
        SubParams memory sub = parseSubInputs(_subData);

        // Health factor represents safety ratio in aaveV4, scaled in WAD.
        uint256 ratio = ISpoke(sub.spoke).getUserAccountData(sub.user).healthFactor;

        // HF will be max uint256 if user has no debt. In that case we don't want to trigger.
        if (ratio == type(uint256).max) return false;

        tempStorage.setBytes32("AAVE_V4_RATIO", bytes32(ratio));

        return RatioState(sub.state) == RatioState.OVER ? ratio > sub.ratio : ratio < sub.ratio;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
