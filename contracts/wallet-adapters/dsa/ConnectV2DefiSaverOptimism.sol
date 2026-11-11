// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DefiSaverResolver } from "./resolver.sol";

/// @title ConnectV2DefiSaverOptimism
/// @notice Instadapp connector for DefiSaver on Optimism.
/// @dev Forwards calls to RecipeExecutor via delegatecall in the context of DSA accounts.
///      Uses a hardcoded RecipeExecutor address. Features introduced in newer versions require
///      redeploying this connector and whitelisting the new deployment in the Instadapp registry.
contract ConnectV2DefiSaverOptimism is DefiSaverResolver {
    string public constant name = "DefiSaver-v1";
    address internal constant RECIPE_EXECUTOR_ADDR = 0x30CEf36b14Dd71A347284204C48E134D04c24331;

    /// @inheritdoc DefiSaverResolver
    function getRecipeExecutorAddress() public pure override returns (address) {
        return RECIPE_EXECUTOR_ADDR;
    }
}
