// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../core/DFSRegistry.sol";
import "../core/helpers/CoreHelper.sol";
import "../core/RecipeExecutor.sol";
import "../core/strategy/StrategyModel.sol";
import "./CookBook.sol";

contract L2RecipeExecutorEntry is L2StrategyModel, StrategyModel, CoreHelper, RecipeExecutor {
    DFSRegistry internal constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant internal RECIPE_EXECUTOR_ID = 0x4c69ee1e;
    bytes4 constant internal COOK_BOOK_ID = 0xfb312bdc;

    error RecipeExecutorReverted();

    function executeRecipe(uint16 _recipeId, bytes[] memory _callData) public payable {
        address recipeExecutorAddr = registry.getAddr(RECIPE_EXECUTOR_ID);
        address cookBookAddr = registry.getAddr(COOK_BOOK_ID);

        RecipeTemplate memory template = CookBook(cookBookAddr).getTemplate(_recipeId);
        Recipe memory recipe = Recipe(
            template.name,
            _callData,
            new bytes32[](0),
            template.actionIds,
            template.paramMapping
        );

        (bool success, ) = recipeExecutorAddr.delegatecall(
            abi.encodeWithSelector(
                RecipeExecutor.executeRecipe.selector, recipe
            )
        );

        if (!success) revert RecipeExecutorReverted();
    }

    /// @dev This function uses a custom encoding scheme saving 30 bytes of calldata compared to the function above
    function executeRecipe() public payable {
        // skip function selector and get 2 bytes signifying recipe id
        uint16 recipeId = uint16(bytes2(msg.data[4:6]));
        bytes[] memory callData = abi.decode(msg.data[6:], (bytes[]));

        address recipeExecutorAddr = registry.getAddr(RECIPE_EXECUTOR_ID);
        address cookBookAddr = registry.getAddr(COOK_BOOK_ID);

        RecipeTemplate memory template = CookBook(cookBookAddr).getTemplate(recipeId);
        Recipe memory recipe = Recipe(
            template.name,
            callData,
            new bytes32[](0),
            template.actionIds,
            template.paramMapping
        );

        (bool success, ) = recipeExecutorAddr.delegatecall(
            abi.encodeWithSelector(
                RecipeExecutor.executeRecipe.selector, recipe
            )
        );

        if (!success) revert RecipeExecutorReverted();
    }
}