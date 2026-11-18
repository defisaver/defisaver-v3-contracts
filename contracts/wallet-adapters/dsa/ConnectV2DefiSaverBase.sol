// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DefiSaverResolver } from "./resolver.sol";

/// @title ConnectV2DefiSaverBase
/// @notice Instadapp connector for DefiSaver on Base.
/// @dev Forwards calls to RecipeExecutor via delegatecall in the context of DSA accounts.
///      Uses a hardcoded RecipeExecutor address. Features introduced in newer versions require
///      redeploying this connector and whitelisting the new deployment in the Instadapp registry.
contract ConnectV2DefiSaverBase is DefiSaverResolver {
    string public constant name = "DefiSaver-v1";
    address internal constant RECIPE_EXECUTOR_ADDR = 0x7De85e67745a027D41Aba5Fe2D9b288e6467d710;

    /// @inheritdoc DefiSaverResolver
    function getRecipeExecutorAddress() public pure override returns (address) {
        return RECIPE_EXECUTOR_ADDR;
    }
}
