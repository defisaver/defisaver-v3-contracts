// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../interfaces/ILendingPool.sol";
import "../auth/ProxyPermission.sol";
import "../actions/ActionBase.sol";
import "../core/DFSRegistry.sol";
import "./strategy/StrategyModel.sol";
import "./strategy/StrategyStorage.sol";
import "./strategy/SubStorage.sol";


/// @title Handles FL taking and executes actions
contract RecipeExecutor is StrategyModel, ProxyPermission, AdminAuth {
    address public constant DEFISAVER_LOGGER = 0x5c55B921f590a89C1Ebe84dF170E655a82b62126;

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));
    bytes4 constant SUB_STORAGE_ID = bytes4(keccak256("SubStorage"));

    /// @notice Called directly through DsProxy to execute a recipe
    /// @dev This is the main entry point for Recipes executed manually
    /// @param _currRecipe Recipe to be executed
    function executeRecipe(Recipe memory _currRecipe) public payable {
        _executeActions(_currRecipe);
    }

    /// @notice Called through the Strategy contract to execute a recipe
    /// @param _subId Id of the subscription we want to execute
    /// @param _actionCallData All the data related to the strategies Recipe
    function executeRecipeFromStrategy(uint256 _subId, bytes[] memory _actionCallData)
        public
        payable
    {
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);
        address strategyStorageAddr = registry.getAddr(STRATEGY_STORAGE_ID);

        StrategySub memory sub = SubStorage(subStorageAddr).getSub(_subId);
        Strategy memory strategy = StrategyStorage(strategyStorageAddr).getStrategy(sub.strategyId);

        // if this is a one time strategy
        if (!strategy.continuous) {
            SubStorage(subStorageAddr).deactivateSub(_subId);
        }

        Recipe memory currRecipe =
            Recipe({
                name: strategy.name,
                callData: _actionCallData,
                subData: sub.recipeData,
                actionIds: strategy.actionIds,
                paramMapping: strategy.paramMapping
            });

        _executeActions(currRecipe);
    }

    /// @notice This is the callback function that FL actions call
    /// @dev FL function must be the first action and repayment is done last
    /// @param _currRecipe Recipe to be executed
    /// @param _flAmount Result value from FL action
    function _executeActionsFromFL(Recipe memory _currRecipe, bytes32 _flAmount) public payable {
        bytes32[] memory returnValues = new bytes32[](_currRecipe.actionIds.length);
        returnValues[0] = _flAmount; // set the flash loan action as first return value

        // skips the first actions as it was the fl action
        for (uint256 i = 1; i < _currRecipe.actionIds.length; ++i) {
            returnValues[i] = _executeAction(_currRecipe, i, returnValues);
        }
    }

    /// @notice Runs all actions from the recipe
    /// @dev FL action must be first and is parsed separately, execution will go to _executeActionsFromFL
    /// @param _currRecipe to be executed
    function _executeActions(Recipe memory _currRecipe) internal {
        address firstActionAddr = registry.getAddr(_currRecipe.actionIds[0]);

        bytes32[] memory returnValues = new bytes32[](_currRecipe.actionIds.length);

        if (isFL(firstActionAddr)) {
            _parseFLAndExecute(_currRecipe, firstActionAddr, returnValues);
        } else {
            for (uint256 i = 0; i < _currRecipe.actionIds.length; ++i) {
                returnValues[i] = _executeAction(_currRecipe, i, returnValues);
            }
        }

        /// log the recipe name
        DefisaverLogger(DEFISAVER_LOGGER).Log(address(this), msg.sender, _currRecipe.name, "");
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
                "executeAction(bytes,bytes[],uint8[],bytes32[])",
                _currRecipe.callData[_index],
                _currRecipe.subData,
                _currRecipe.paramMapping[_index],
                _returnValues
            )
        );
    }

    /// @notice Prepares and executes a flash loan action
    /// @dev It adds to the last input value of the FL, the recipe data so it can be passed on
    /// @param _currRecipe Recipe to be executed
    /// @param _flActionAddr Address of the flash loan action
    /// @param _returnValues An empty array of return values, because it's the first action
    function _parseFLAndExecute(
        Recipe memory _currRecipe,
        address _flActionAddr,
        bytes32[] memory _returnValues
    ) internal {
        givePermission(_flActionAddr);

        bytes memory recipeData = abi.encode(_currRecipe, address(this));

        // last input value is empty for FL action, attach recipe data there
        _currRecipe.callData[_currRecipe.callData[0].length - 1] = recipeData; // TODO: check this

        /// @dev FL action is called directly so that we can check who the msg.sender of FL is
        ActionBase(_flActionAddr).executeAction(
            _currRecipe.callData[0], // TODO: check this
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
