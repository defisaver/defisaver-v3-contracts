// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

contract L2StrategyModel {
    /// @param name Name of the recipe template useful for logging
    /// @param actionIds Array of identifiers for actions - bytes4(keccak256(ActionName))
    /// @param paramMapping Describes how inputs to functions are piped from return/subbed values
    struct RecipeTemplate {
        string name;
        bytes4[] actionIds;
        uint8[][] paramMapping;
    }
}