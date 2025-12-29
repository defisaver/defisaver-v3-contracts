// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title Proxy that delegatecalls to RecipeExecutor for SFProxy wallets
contract SFProxyEntryPoint is CoreHelper {
    error RecipeExecutionError();

    /// @notice Forwards all calls to RecipeExecutor via delegatecall
    fallback(bytes calldata data) external payable returns (bytes memory) {
        (bool success,) = getRecipeExecutorAddress().delegatecall(data);
        if (!success) revert RecipeExecutionError();

        return "";
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
