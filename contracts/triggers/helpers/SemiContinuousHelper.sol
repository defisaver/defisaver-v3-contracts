// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISemiContinuousTracker } from "../../interfaces/core/ISemiContinuousTracker.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract SemiContinuousHelper is CoreHelper {
    IDFSRegistry private constant registry = IDFSRegistry(REGISTRY_ADDR);

    function _shouldTriggerAnyway(uint256 _subId) internal view returns (bool) {
        ISemiContinuousTracker semiContinuousTracker =
            ISemiContinuousTracker(registry.getAddr(DFSIds.SEMI_CONTINUOUS_TRACKER));

        address executionWallet = semiContinuousTracker.executionWalletOf(_subId);

        // TODO -> STVNR should be added to registry
        address stvnrAddr = registry.getAddr(DFSIds.STVNR);

        // we want trigger to always be true for a sub that is already in execution
        if (executionWallet == msg.sender) return true;
        // for STVNR check, always return true if sub is in execution
        if (executionWallet != address(0) && msg.sender == stvnrAddr) return true;

        return false;
    }
}
