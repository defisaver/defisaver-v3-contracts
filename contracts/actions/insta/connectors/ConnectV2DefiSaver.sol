// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DefiSaverResolver } from "./resolver.sol";

/// @title ConnectV2DefiSaver
/// @notice Instadapp connector for DefiSaver on Mainnet
/// @dev Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract ConnectV2DefiSaver is DefiSaverResolver {
    string public constant name = "DefiSaver-v1";
    address internal constant RECIPE_EXECUTOR_ADDR = 0x4677c84699ab29637102609cD2868d0743a48DdF;

    /// @inheritdoc DefiSaverResolver
    function getRecipeExecutorAddress() public pure override returns (address) {
        return RECIPE_EXECUTOR_ADDR;
    }
}
