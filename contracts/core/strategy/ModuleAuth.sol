// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/IDFSRegistry.sol";
import "../../auth/AdminAuth.sol";
import "./../helpers/CoreHelper.sol";
import "../../interfaces/safe/ISafe.sol";

contract ModuleAuth is AdminAuth, CoreHelper {
     IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @dev The id is on purpose not the same as contract name for easier deployment
    bytes4 constant STRATEGY_EXECUTOR_ID = bytes4(keccak256("StrategyExecutorID"));

    error SenderNotExecutorError(address, address);

    modifier onlyExecutor {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);

        if (msg.sender != executorAddr){
            revert SenderNotExecutorError(msg.sender, executorAddr);
        }

        _;
    }

    /// @notice Calls the .execute() method of the specified users Safe
    /// @dev Contract gets the authority from the user to call it, only callable by Executor
    /// @param _safeAddr Address of the users Safe
    /// @param _recipeExecutorAddr Address of the recipe executor supplied by StrategyExecutor
    /// @param _callData Call data of the function to be called
    function callExecute(
        address _safeAddr,
        address _recipeExecutorAddr,
        bytes memory _callData
    ) public payable onlyExecutor {
       ISafe(_safeAddr).execTransactionFromModule(_recipeExecutorAddr, msg.value, _callData, ISafe.Operation.DelegateCall);
    }
}