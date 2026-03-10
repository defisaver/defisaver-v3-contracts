// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DefiSaverResolver } from "./resolver.sol";

/// @title ConnectV2DefiSaverOptimism
/// @notice Instadapp connector for DefiSaver on Optimism
/// @dev Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract ConnectV2DefiSaverOptimism is DefiSaverResolver {
    string public constant name = "DefiSaver-v1";
    address internal constant RECIPE_EXECUTOR_ADDR = 0x30CEf36b14Dd71A347284204C48E134D04c24331;

    /// @inheritdoc DefiSaverResolver
    function getRecipeExecutorAddress() public pure override returns (address) {
        return RECIPE_EXECUTOR_ADDR;
    }
}
