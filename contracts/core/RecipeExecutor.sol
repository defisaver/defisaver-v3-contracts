// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/IDSProxy.sol";
import "../auth/ProxyPermission.sol";
import "../actions/ActionBase.sol";
import "../core/DFSRegistry.sol";
import "./strategy/StrategyModel.sol";
import "./strategy/StrategyStorage.sol";
import "./strategy/BundleStorage.sol";
import "./strategy/SubStorage.sol";
import "../interfaces/flashloan/IFlashLoanBase.sol";
import "../interfaces/ITrigger.sol";

import "hardhat/console.sol";

/// @title Entry point into executing recipes/checking triggers directly and as part of a strategy
contract RecipeExecutor is StrategyModel, ProxyPermission, AdminAuth, CoreHelper {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    error TriggerNotActiveError(uint256);

    /// @notice Called directly through DsProxy to execute a recipe
    /// @dev This is the main entry point for Recipes executed manually
    /// @param _currRecipe Recipe to be executed
    function executeRecipe(Recipe calldata _currRecipe) public payable {
        _executeActions(_currRecipe);
    }


    /// @notice Called by users DSProxy through the ProxyAuth to execute a recipe & check triggers
    /// @param _subId Id of the subscription we want to execute
    /// @param _actionCallData All input data needed to execute actions
    /// @param _triggerCallData All input data needed to check triggers
    /// @param _strategyIndex Which strategy in a bundle, need to specify because when sub is part of a bundle
    /// @param _sub All the data related to the strategies Recipe
    function executeRecipeFromStrategy(
        uint256 _subId,
        bytes[] calldata _actionCallData,
        bytes[] calldata _triggerCallData,
        uint256 _strategyIndex,
        StrategySub memory _sub
    ) public payable {
        console.log("executeRecipeFromStrategy");
        Strategy memory strategy;

        { // to handle stack too deep
            uint256 strategyId = _sub.strategyOrBundleId;

            // fetch strategy if inside of bundle
            if (_sub.isBundle) {
                strategyId = BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(strategyId, _strategyIndex);
            }

            strategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(strategyId);
        }

        // check if all the triggers are true
        (bool triggered, uint256 errIndex) 
            = _checkTriggers(strategy, _sub, _triggerCallData, _subId, SUB_STORAGE_ADDR);

        if (!triggered) {
            revert TriggerNotActiveError(errIndex);
        }

        // if this is a one time strategy
        if (!strategy.continuous) {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(_subId);
        }

        // format recipe from strategy
        Recipe memory currRecipe = Recipe({
            name: strategy.name,
            callData: _actionCallData,
            subData: _sub.subData,
            actionIds: strategy.actionIds,
            paramMapping: strategy.paramMapping
        });

        _executeActions(currRecipe);
    }

    /// @notice Checks if all the triggers are true
    function _checkTriggers(
        Strategy memory strategy,
        StrategySub memory _sub,
        bytes[] calldata _triggerCallData,
        uint256 _subId,
        address _storageAddr
    ) internal returns (bool, uint256) {
        bytes4[] memory triggerIds = strategy.triggerIds;

        bool isTriggered;
        address triggerAddr;
        uint256 i;

                console.log("_checkTriggers");


        for (i = 0; i < triggerIds.length; i++) {
            triggerAddr = registry.getAddr(triggerIds[i]);

            console.logBytes(_triggerCallData[i]);

            console.log(triggerAddr);
            isTriggered = ITrigger(triggerAddr).isTriggered(
                _triggerCallData[i],
                _sub.triggerData[i]
            );


            console.log(isTriggered);

            if (!isTriggered) return (false, i);

            // after execution triggers flag-ed changeable can update their value
            if (ITrigger(triggerAddr).isChangeable()) {
                _sub.triggerData[i] = ITrigger(triggerAddr).changedSubData(_sub.triggerData[i]);
                SubStorage(_storageAddr).updateSubData(_subId, _sub);
            }
        }

        return (true, i);
    }

    /// @notice This is the callback function that FL actions call
    /// @dev FL function must be the first action and repayment is done last
    /// @param _currRecipe Recipe to be executed
    /// @param _flAmount Result value from FL action
    function _executeActionsFromFL(Recipe calldata _currRecipe, bytes32 _flAmount) public payable {
        bytes32[] memory returnValues = new bytes32[](_currRecipe.actionIds.length);
        returnValues[0] = _flAmount; // set the flash loan action as first return value

        // skips the first actions as it was the fl action
        for (uint256 i = 1; i < _currRecipe.actionIds.length; ++i) {
            console.log(i);
            returnValues[i] = _executeAction(_currRecipe, i, returnValues);
        }
    }

    /// @notice Runs all actions from the recipe
    /// @dev FL action must be first and is parsed separately, execution will go to _executeActionsFromFL
    /// @param _currRecipe Recipe to be executed
    function _executeActions(Recipe memory _currRecipe) internal {
        address firstActionAddr = registry.getAddr(_currRecipe.actionIds[0]);

        bytes32[] memory returnValues = new bytes32[](_currRecipe.actionIds.length);

        if (isFL(firstActionAddr)) {
            _parseFLAndExecute(_currRecipe, firstActionAddr, returnValues);
        } else {
            for (uint256 i = 0; i < _currRecipe.actionIds.length; ++i) {
                            console.log(i);

                returnValues[i] = _executeAction(_currRecipe, i, returnValues);
            }
        }

        /// log the recipe name
        DefisaverLogger(DEFISAVER_LOGGER).logRecipeEvent(_currRecipe.name);
    }

    /// @notice Gets the action address and executes it
    /// @param _currRecipe Recipe to be executed
    /// @param _index Index of the action in the recipe array
    /// @param _returnValues Return values from previous actions
    function _executeAction(
        Recipe memory _currRecipe,
        uint256 _index,
        bytes32[] memory _returnValues
    ) internal returns (bytes32 response) {

        address actionAddr = registry.getAddr(_currRecipe.actionIds[_index]);

        response = IDSProxy(address(this)).execute(
            actionAddr,
            abi.encodeWithSignature(
                "executeAction(bytes,bytes32[],uint8[],bytes32[])",
                _currRecipe.callData[_index],
                _currRecipe.subData,
                _currRecipe.paramMapping[_index],
                _returnValues
            )
        );
    }

    /// @notice Prepares and executes a flash loan action
    /// @dev It adds to the first input value of the FL, the recipe data so it can be passed on
    /// @param _currRecipe Recipe to be executed
    /// @param _flActionAddr Address of the flash loan action
    /// @param _returnValues An empty array of return values, because it"s the first action
    function _parseFLAndExecute(
        Recipe memory _currRecipe,
        address _flActionAddr,
        bytes32[] memory _returnValues
    ) internal {
        givePermission(_flActionAddr);

        // encode data for FL
        bytes memory recipeData = abi.encode(_currRecipe, address(this));
        IFlashLoanBase.FlashLoanParams memory params = abi.decode(
            _currRecipe.callData[0],
            (IFlashLoanBase.FlashLoanParams)
        );
        params.recipeData = recipeData;
        _currRecipe.callData[0] = abi.encode(params);

        /// @dev FL action is called directly so that we can check who the msg.sender of FL is
        ActionBase(_flActionAddr).executeAction(
            _currRecipe.callData[0],
            _currRecipe.subData,
            _currRecipe.paramMapping[0],
            _returnValues
        );

        removePermission(_flActionAddr);
    }

    /// @notice Checks if the specified address is of FL type action
    /// @param _actionAddr Address of the action
    function isFL(address _actionAddr) internal pure returns (bool) {
        return ActionBase(_actionAddr).actionType() == uint8(ActionBase.ActionType.FL_ACTION);
    }
}
