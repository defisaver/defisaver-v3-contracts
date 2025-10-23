// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/IDFSRegistry.sol";
import { IAuth } from "../../interfaces/IAuth.sol";
import { Pausable } from "../../auth/Pausable.sol";
import { CoreHelper } from "./../helpers/CoreHelper.sol";

/// @notice Base auth contract used by all specific auth contracts
abstract contract WalletAuth is Pausable, CoreHelper, IAuth {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @dev The id is on purpose not the same as contract name for easier deployment
    bytes4 constant STRATEGY_EXECUTOR_ID = bytes4(keccak256("StrategyExecutorID"));

    /// Only callable by the executor
    error SenderNotExecutorError(address, address);

    modifier onlyExecutor {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);

        if (msg.sender != executorAddr){
            revert SenderNotExecutorError(msg.sender, executorAddr);
        }

        _;
    }
}