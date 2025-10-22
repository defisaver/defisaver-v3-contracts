// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ISafe } from "../../interfaces/safe/ISafe.sol";
import { WalletAuth } from "./WalletAuth.sol";

/// @title SafeModuleAuth Gets safe module auth from users and is callable by StrategyExecutor
contract SafeModuleAuth is WalletAuth {
    
    /// Revert if execution fails when using safe wallet
    error SafeExecutionError();

    /// @notice Calls the .executeTransactionFromModule() method of the specified users Safe
    /// @dev Contract gets the authority from the user to call it
    /// @dev Only callable by StrategyExecutor
    /// @dev Only callable when not paused
    /// @param _safeAddr Address of the users Safe
    /// @param _recipeExecutorAddr Address of the recipe executor supplied by StrategyExecutor
    /// @param _callData Call data of the function to be called
    function callExecute(
        address _safeAddr,
        address _recipeExecutorAddr,
        bytes memory _callData
    ) external payable onlyExecutor notPaused {
        bool success = ISafe(_safeAddr).execTransactionFromModule(
            _recipeExecutorAddr,
            msg.value,
            _callData,
            ISafe.Operation.DelegateCall
        );

       // Execute from module does not revert on failure so we explicitly revert if it fails
       if (!success) {
            revert SafeExecutionError();
       }
    }
}
