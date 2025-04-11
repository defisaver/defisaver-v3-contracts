

// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAction } from "../interfaces/core/IAction.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { IDFSLogger } from "../interfaces/core/IDFSLogger.sol";

import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { Receiver } from "../utils/Receiver.sol";
import { ReentrancyGuardTransient } from "../utils/ReentrancyGuardTransient.sol";

/// @title Minimal prototype version of Recipe Executor with EIP-7702 support
/// @notice Only supports executing recipes without FL actions through EOA account.
/// @dev UNAUDITED CODE, DO NOT USE IN PRODUCTION.
contract EIP7702RecipeExecutor is Receiver, ReentrancyGuardTransient, StrategyModel {

    address internal immutable REGISTRY_ADDR;
    address internal immutable LOGGER_ADDR;

    error ZeroAddress();
    error Unauthorized();

    constructor(address _registry, address _logger) {
        REGISTRY_ADDR = _registry;
        LOGGER_ADDR = _logger;
    }

    /// @notice Called directly through user EOA to execute a recipe
    /// @param _recipe Recipe to be executed
    function executeRecipe(Recipe calldata _recipe) public payable nonReentrant {
        // Only Account owner can call this function
        if (msg.sender != address(this)) revert Unauthorized();

        // initialize return values array
        bytes32[] memory returnValues = new bytes32[](_recipe.actionIds.length);

        // execute each action in the recipe
        for (uint256 i = 0; i < _recipe.actionIds.length; ++i) {

            // fetch action address from registry
            address actionAddr = IDFSRegistry(REGISTRY_ADDR).getAddr(_recipe.actionIds[i]);

            // encode action call data
            bytes memory actionData = abi.encodeCall(
                IAction.executeAction,
                (
                    _recipe.callData[i],
                    _recipe.subData,
                    _recipe.paramMapping[i],
                    returnValues
                )
            );

            // delegatecall call to action and store return value
            returnValues[i] = _delegateCallAndReturnBytes32(actionAddr, actionData);
        }

        /// log the recipe name
        IDFSLogger(LOGGER_ADDR).logRecipeEvent(_recipe.name);
    }

    /// @notice Internal function for low level delegatecall
    /// @param _target Address of the contract to delegatecall
    /// @param _data Data to be passed to the delegatecall
    /// @dev Returns bytes32 value from delegatecall
    function _delegateCallAndReturnBytes32(address _target, bytes memory _data) internal returns (bytes32 response) {
        if (_target == address(0)) revert ZeroAddress();

        assembly {
            // call contract in current context (EOA)
            let succeeded := delegatecall(sub(gas(), 5000), _target, add(_data, 0x20), mload(_data), 0, 32)
            
            // load delegatecall output
            response := mload(0)
            
            // revert if delegatecall failed
            if eq(succeeded, 0) {
                revert(0, 0)
            }
        }
    }
}
