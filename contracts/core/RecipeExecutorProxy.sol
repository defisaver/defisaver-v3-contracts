// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {CoreHelper} from "./helpers/CoreHelper.sol";
import {DFSRegistry} from "./DFSRegistry.sol";
import {StrategyModel} from "./strategy/StrategyModel.sol";

/// @title Proxy contract that delegatecalls to RecipeExecutor
/// @notice This contract should be whitelisted instead of RecipeExecutor directly
///         When RecipeExecutor is upgraded, this proxy will automatically use the new version
contract RecipeExecutorProxy is CoreHelper, StrategyModel {
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    error DelegatecallFailed();

    /// @notice Executes a recipe by delegatecalling to the current RecipeExecutor
    /// @param _currRecipe Recipe to be executed
    function executeRecipe(Recipe calldata _currRecipe) public payable {
        address recipeExecutor = registry.getAddr(RECIPE_EXECUTOR_ID);

        (bool success, bytes memory result) =
            recipeExecutor.delegatecall(abi.encodeCall(this.executeRecipe, (_currRecipe)));

        if (!success) {
            _bubbleRevert(result);
        }
    }

    /// @notice Executes actions from FL callback by delegatecalling to the current RecipeExecutor
    /// @param _currRecipe Recipe to be executed
    /// @param _flAmount Flash loan amount
    function _executeActionsFromFL(Recipe calldata _currRecipe, bytes32 _flAmount) public payable {
        address recipeExecutor = registry.getAddr(RECIPE_EXECUTOR_ID);

        (bool success, bytes memory result) =
            recipeExecutor.delegatecall(abi.encodeCall(this._executeActionsFromFL, (_currRecipe, _flAmount)));

        if (!success) {
            _bubbleRevert(result);
        }
    }

    function _bubbleRevert(bytes memory result) internal pure {
        if (result.length > 0) {
            assembly {
                let result_size := mload(result)
                revert(add(32, result), result_size)
            }
        }
        revert DelegatecallFailed();
    }
}

