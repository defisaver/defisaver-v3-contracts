// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../interfaces/IDFSRegistry.sol";
import "../interfaces/IDSProxy.sol";
import "../auth/AdminAuth.sol";
import "./helpers/CoreHelper.sol";

/// @title ProxyAuth Gets DSProxy auth from users and is callable by the Executor
contract ProxyAuth is AdminAuth, CoreHelper {

    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    bytes4 constant STRATEGY_EXECUTOR_ID = bytes4(keccak256("StrategyExecutor"));
    string public constant ERR_SENDER_NOT_EXECUTOR = "Sender not executor addr";

    error SenderNotExecutorError();

    modifier onlyExecutor {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);

        if (msg.sender != executorAddr){
            revert SenderNotExecutorError();
        }
        _;
    }

    /// @notice Calls the .execute() method of the specified users DSProxy
    /// @dev Contract gets the authority from the user to call it, only callable by Executor
    /// @param _proxyAddr Address of the users DSProxy
    /// @param _contractAddr Address of the contract which to execute
    /// @param _data Call data of the function to be called
    function callExecute(
        address _proxyAddr,
        address _contractAddr,
        bytes memory _data
    ) public payable onlyExecutor {
        IDSProxy(_proxyAddr).execute{value: msg.value}(_contractAddr, _data);
    }

}