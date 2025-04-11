

// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAction } from "../interfaces/core/IAction.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { IDFSLogger } from "../interfaces/core/IDFSLogger.sol";
import { IFlashLoanBase } from "../interfaces/flashloan/IFlashLoanBase.sol";

import { ActionBase } from "../actions/ActionBase.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { Receiver } from "../utils/Receiver.sol";
import { ReentrancyGuardTransient } from "../utils/ReentrancyGuardTransient.sol";

/// @title Minimal prototype version of Recipe Executor with EIP-7702 support
/// @dev UNAUDITED CODE, DO NOT USE IN PRODUCTION.
contract EIP7702RecipeExecutor is Receiver, ReentrancyGuardTransient, StrategyModel {

    address internal immutable REGISTRY_ADDR;
    address internal immutable LOGGER_ADDR;

    error ZeroAddress();
    error Unauthorized();
    error InvalidFLContract();

    constructor(address _registry, address _logger) {
        REGISTRY_ADDR = _registry;
        LOGGER_ADDR = _logger;
    }

    /// @notice Called directly through user EOA to execute a recipe
    /// @param _recipe Recipe to be executed
    function executeRecipe(Recipe calldata _recipe) public payable nonReentrant {
        // Only Account owner can call this function.
        if (msg.sender != address(this)) revert Unauthorized();

        address firstActionAddr = IDFSRegistry(REGISTRY_ADDR).getAddr(_recipe.actionIds[0]);

        bytes32[] memory returnValues = new bytes32[](_recipe.actionIds.length);

        if (isFL(firstActionAddr)) {
            _parseFLAndExecute(_recipe, firstActionAddr, returnValues);
        } else {
            for (uint256 i = 0; i < _recipe.actionIds.length; ++i) {
                returnValues[i] = _executeAction(_recipe, i, returnValues);
            }
        }

        // Log the recipe name.
        IDFSLogger(LOGGER_ADDR).logRecipeEvent(_recipe.name);
    }

    /// @notice This is the callback function that FL actions call
    /// @dev FL function must be the first action and repayment is done last
    /// @param _currRecipe Recipe to be executed
    /// @param _flAmount Result value from FL action
    function _executeActionsFromFL(Recipe calldata _currRecipe, bytes32 _flAmount) public payable {

        _requireThatAccountOwnerIsInitialCaller();

        _requireThatMsgSenderIsValidFLContract(_currRecipe.actionIds[0]);

        bytes32[] memory returnValues = new bytes32[](_currRecipe.actionIds.length);
        returnValues[0] = _flAmount; // set the flash loan action as first return value

        // skips the first actions as it was the fl action
        for (uint256 i = 1; i < _currRecipe.actionIds.length; ++i) {
            returnValues[i] = _executeAction(_currRecipe, i, returnValues);
        }
    }

    /// @notice Gets the action address and executes it
    /// @dev We delegate context of user's eoa to action contract
    /// @param _currRecipe Recipe to be executed
    /// @param _index Index of the action in the recipe array
    /// @param _returnValues Return values from previous actions
    function _executeAction(
        Recipe memory _currRecipe,
        uint256 _index,
        bytes32[] memory _returnValues
    ) internal returns (bytes32 response) {

        address actionAddr = IDFSRegistry(REGISTRY_ADDR).getAddr(_currRecipe.actionIds[_index]);

        response = _delegateCallAndReturnBytes32(
            actionAddr,
            abi.encodeCall(
                IAction.executeAction,
                (
                    _currRecipe.callData[_index],
                    _currRecipe.subData,
                    _currRecipe.paramMapping[_index],
                    _returnValues
                )
            )
        );
    }

    /// @notice Prepares and executes a flash loan action
    /// @dev It adds to the first input value of the FL, the recipe data so it can be passed on
    /// @param _currRecipe Recipe to be executed
    /// @param _flActionAddr Address of the flash loan action,
    /// @param _returnValues An empty array of return values, because it's the first action
    function _parseFLAndExecute(
        Recipe memory _currRecipe,
        address _flActionAddr,
        bytes32[] memory _returnValues
    ) internal {

        _storeInitialCaller();

        // Encode data for FL.
        IFlashLoanBase.FlashLoanParams memory params = abi.decode(
            _currRecipe.callData[0],
            (IFlashLoanBase.FlashLoanParams)
        );
        params.recipeData = abi.encode(
            _currRecipe,
            address(this), // EOA
            true // isEip7702RecipeExecutor
        );
        _currRecipe.callData[0] = abi.encode(params);

        // FL action is called directly.
        ActionBase(_flActionAddr).executeAction(
            _currRecipe.callData[0],
            _currRecipe.subData,
            _currRecipe.paramMapping[0],
            _returnValues
        );

        _removeInitialCaller();
    }

    function _requireThatAccountOwnerIsInitialCaller() internal view {
        if (_getInitialCaller() != address(this)) revert Unauthorized();
    }

    function _requireThatMsgSenderIsValidFLContract(bytes4 _actionId) internal view {
        address actionAddr = IDFSRegistry(REGISTRY_ADDR).getAddr(_actionId);
        if (actionAddr == address(0) || !isFL(actionAddr) || actionAddr != msg.sender) {
            revert InvalidFLContract();
        }
    }

    /// @notice Stores the caller (Account owner) address in slot 0 of the transient storage
    function _storeInitialCaller() internal {
        assembly {
            tstore(0, caller())
        }
    }

    /// @notice Removes the caller (Account owner) address from slot 0 of the transient storage
    function _removeInitialCaller() internal {
        assembly {
            tstore(0, 0)
        }
    }

    /// @notice Returns the stored caller (Account owner) from slot 0 of the transient storage.
    /// @dev This function is used to validate whether the Account owner has initiated this transaction
    function _getInitialCaller() internal view returns (address sender) {
        assembly {
            sender := tload(0)
        }
    }

    /// @notice Checks if the specified address is of FL type action
    /// @param _actionAddr Address of the action
    function isFL(address _actionAddr) internal pure returns (bool) {
        return ActionBase(_actionAddr).actionType() == uint8(ActionBase.ActionType.FL_ACTION);
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
            
            // throw if delegatecall failed
            if eq(succeeded, 0) {
                revert(0, 0)
            }
        }
    }
}
