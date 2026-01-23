// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { IAuth } from "../../interfaces/core/IAuth.sol";
import { Pausable } from "../../auth/Pausable.sol";
import { CoreHelper } from "./../helpers/CoreHelper.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @notice Base auth contract used by all specific auth contracts
abstract contract WalletAuth is Pausable, CoreHelper, IAuth {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// Only callable by the executor
    error SenderNotExecutorError(address, address);

    modifier onlyExecutor() {
        address executorAddr = registry.getAddr(DFSIds.STRATEGY_EXECUTOR);

        if (msg.sender != executorAddr) {
            revert SenderNotExecutorError(msg.sender, executorAddr);
        }

        _;
    }
}
