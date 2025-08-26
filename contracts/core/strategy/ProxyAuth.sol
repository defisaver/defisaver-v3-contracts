// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/IDFSRegistry.sol";
import { IDSProxy } from "../../interfaces/IDSProxy.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { CoreHelper } from "./../helpers/CoreHelper.sol";

/// @title ProxyAuth Gets DSProxy auth from users and is callable by the Executor
contract ProxyAuth is AdminAuth, CoreHelper {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @dev The id is on purpose not the same as contract name for easier deployment
    bytes4 constant STRATEGY_EXECUTOR_ID = bytes4(keccak256("StrategyExecutorID"));

    error SenderNotExecutorError(address, address);

    modifier onlyExecutor() {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);

        if (msg.sender != executorAddr) {
            revert SenderNotExecutorError(msg.sender, executorAddr);
        }

        _;
    }

    /// @notice Calls the .execute() method of the specified users DSProxy
    /// @dev Contract gets the authority from the user to call it, only callable by Executor
    /// @param _proxyAddr Address of the users DSProxy
    /// @param _contractAddr Address of the contract which to execute
    /// @param _callData Call data of the function to be called
    function callExecute(address _proxyAddr, address _contractAddr, bytes memory _callData)
        public
        payable
        onlyExecutor
    {
        IDSProxy(_proxyAddr).execute{ value: msg.value }(_contractAddr, _callData);
    }
}
