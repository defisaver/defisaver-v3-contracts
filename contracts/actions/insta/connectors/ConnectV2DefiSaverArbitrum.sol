// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DefiSaverResolver } from "./resolver.sol";

/// @title ConnectV2DefiSaverArbitrum
/// @notice Instadapp connector for DefiSaver on Arbitrum
/// @dev Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract ConnectV2DefiSaverArbitrum is DefiSaverResolver {
    string public constant name = "DefiSaver-v1";
    address internal constant RECIPE_EXECUTOR_ADDR = 0x6927F7Dc79B4215F307e6c1C4d5883d134053BAB;

    /// @inheritdoc DefiSaverResolver
    function getRecipeExecutorAddress() public pure override returns (address) {
        return RECIPE_EXECUTOR_ADDR;
    }
}
