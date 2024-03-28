// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/IDFSRegistry.sol";
import "../../interfaces/IAuth.sol";
import "../../auth/Pausable.sol";
import "./../helpers/CoreHelper.sol";
import "../../interfaces/safe/ISafe.sol";

/// @title SafeModuleAuth Gets safe module auth from users and is callable by the Executor
contract SafeModuleAuth is Pausable, CoreHelper, IAuth {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @dev The id is on purpose not the same as contract name for easier deployment
    bytes4 constant STRATEGY_EXECUTOR_ID = bytes4(keccak256("StrategyExecutorID"));

    /// Only callable by the executor
    error SenderNotExecutorError(address, address);
    /// Revert if execution fails when using safe wallet
    error SafeExecutionError();

    modifier onlyExecutor {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);

        if (msg.sender != executorAddr){
            revert SenderNotExecutorError(msg.sender, executorAddr);
        }

        _;
    }

    /// @notice Calls the .executeTransactionFromModule() method of the specified users Safe
    /// @dev Contract gets the authority from the user to call it, only callable by Executor
    /// @param _safeAddr Address of the users Safe
    /// @param _recipeExecutorAddr Address of the recipe executor supplied by StrategyExecutor
    /// @param _callData Call data of the function to be called
    function callExecute(
        address _safeAddr,
        address _recipeExecutorAddr,
        bytes memory _callData
    ) external payable onlyExecutor notPaused {
       // execute from module does not revert on failure 
       bool success = ISafe(_safeAddr).execTransactionFromModule(_recipeExecutorAddr, msg.value, _callData, ISafe.Operation.DelegateCall);

       if (!success) {
            revert SafeExecutionError();
       }
    }
}
