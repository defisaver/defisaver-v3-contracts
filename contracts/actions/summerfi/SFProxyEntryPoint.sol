// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

/// @title Proxy that delegatecalls to RecipeExecutor for SFProxy wallets
contract SFProxyEntryPoint is CoreHelper, AdminAuth {
    error RecipeExecutionError();

    /// @notice Forwards all calls to RecipeExecutor via delegatecall
    fallback() external payable {
        (bool success,) = getRecipeExecutorAddress().delegatecall(msg.data);
        if (!success) revert RecipeExecutionError();
    }

    /// @notice Gets RecipeExecutor address from registry
    function getRecipeExecutorAddress() public view returns (address) {
        return IDFSRegistry(REGISTRY_ADDR).getAddr(DFSIds.RECIPE_EXECUTOR);
    }

    /// @notice Revert on plain ether transfer
    receive() external payable {
        revert();
    }
}
