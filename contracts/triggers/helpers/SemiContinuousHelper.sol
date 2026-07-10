// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISemiContinuousTracker } from "../../interfaces/core/ISemiContinuousTracker.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract SemiContinuousHelper is CoreHelper {
    IDFSRegistry private constant registry = IDFSRegistry(REGISTRY_ADDR);

    function _isAlreadyInExecution(uint256 _subId) internal view returns (bool) {
        ISemiContinuousTracker semiContinuousTracker =
            ISemiContinuousTracker(registry.getAddr(DFSIds.SEMI_CONTINUOUS_TRACKER));

        address storedWallet = semiContinuousTracker.getWalletForSub(_subId);

        // TODO -> STVNR should be added to registry
        address stvnrAddr = registry.getAddr(DFSIds.STVNR);

        // we want trigger to always be true for started semi-executed sub
        if (storedWallet == msg.sender) return true;
        // for STVNR check, always return true if sub is in storage
        if (storedWallet != address(0) && msg.sender == stvnrAddr) return true;

        return false;
    }
}
