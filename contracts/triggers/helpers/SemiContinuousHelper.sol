// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISemiContinuousTracker } from "../../interfaces/core/ISemiContinuousTracker.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract SemiContinuousHelper is CoreHelper {
    IDFSRegistry private constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @notice If the sub is in semi-continuous execution, should always be triggered
    function _shouldTriggerAnyway(uint256 _subId) internal view returns (bool) {
        return ISemiContinuousTracker(registry.getAddr(DFSIds.SEMI_CONTINUOUS_TRACKER))
                .executionWalletOf(_subId) == msg.sender;
    }
}
