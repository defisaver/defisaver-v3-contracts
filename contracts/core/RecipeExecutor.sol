// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/**
* @title Entry point into executing recipes/checking triggers directly and as part of a strategy
* @dev RecipeExecutor can be used in two scenarios:
* 1) Execute a recipe manually through user's wallet by calling executeRecipe()
*    Here, users can also execute a recipe with a flash loan action. To save on space, the flow will be explained in the next scenario
*
*                                                                                                                       ┌────────────────┐
*                                                                                                                   ┌───┤  1st Action    │
*                                                                                                                   │   └────────────────┘
*                                                                                                                   │
*   Actor                    ┌──────────────┐                    ┌────────────────┐                                 │   ┌────────────────┐
*    ┌─┐                     │              │   Delegate call    │                │    Delegate call each action    ├───┤  2nd Action    │
*    └┼┘                     │              │   - executeRecipe()│                │         - executeAction()       │   └────────────────┘
*  ── │ ──  ─────────────────┤ Smart Wallet ├────────────────────┤ Recipe Executor├─────────────────────────────────┤
*    ┌┴┐                     │              │                    │                │                                 │    . . .
*    │ │                     │              │                    │                │                                 │
*                            └──────────────┘                    └────────────────┘                                 │   ┌────────────────┐
*                                                                                                                   └───┤  nth Action    │
*                                                                                                                       └────────────────┘
*
* 
* 2) Execute a recipe as part of a defi saver strategy system
*
*                             check:
*                             - bot is approved                           check:                 ┌───────────────────────┐
*                             - sub data hash                             msg.sender =           │  SafeModuleAuth       │
*                             - sub is enabled                            strategyExecutor       │ - call tx on safe     │
*  ┌─────┐  executeStrategy() ┌──────────────────┐       callExecute()    ┌────────────┐    IS   │   wallet from module  │
*  │ Bot ├───────────────────►│ StrategyExecutor ├───────────────────────►│   IAuth    ├─────────┼───────────────────────┼────┐
*  └─────┘  pass params:      └──────────────────┘                        └────────────┘         │  ProxyAuth            │    │
*          - subId                                                      user gives permission    │ - call execute on     │    │
*          - strategyIndex                                              to Auth contract to      │   DSProxy             │    │
*          - triggerCallData[]                                          execute tx through       └───────────────────────┘    │
*          - actionsCallData[]                                          smart wallet                                          │
*          - SubscriptionData                                                                                                 │
*                                                                                                                             │
*                                                                                                ┌────────────────────────┐   │
*                                                                                                │      Smart Wallet      │◄──┴─────────────────┐
*                   ┌──────────────┐                                                             └───────────┬────────────┘                     │
*                   │  1st Action  ├───┐                                                                     │            ▲                     │
*                   └──────────────┘   │                                                                     │Delegate    └──────────────────┐  │
*                                      │    Delegate call                                                    │  call                         │  │
*                   ┌──────────────┐   │    each action                   ┌────────────┐                     ▼                               │  │
*                   │  2nd Action  │   │    - executeAction() ┌──┐        │1st Action  │         ┌────────────────────────┐                  │  │
*                   └──────────────┘   ├──────────────────────┤NO├────────┤is Flashloan├─────────┤     Recipe Executor    │                  │  │
*                          ...         │                      └──┘        │  Action?   │         └────────────────────────┘                  │  │
*                   ┌──────────────┐   │                                  └──────┬─────┘              check if triggers                      │  │
*                   │  nth Action  ├───┘                    ┌───────┐            │                       are valid                           │  │
*                   └──────────────┘            ┌───────────┤  YES  ├────────────┘                                                           │  │
*                                               │           └───────┘                                                                        │  │
*                                               ▼                                                                                            │  │
*                                        ┌──────────────┐       giveWalletPermission             ┌────────────────────────┐                  │  │
*                                        │              ├───────────────────────────────────────►│       Permission       │                  │  │
*                                        │              │                                        └────────────────────────┘                  │  │
*                                        │              │                                  -for safe -> enable FL action as module           │  │
*                                        │              │                                  -for dsproxy -> enable FL action to call execute  │  │
*                                        │              │                                                                                    │  │
*                                        │              │                                                                                    │  │
*                                        │              │                          ┌────────┐      Borrow funds    ┌────────┐                │  │
*                                        │              │                          │        ├─────────────────────►│External│                │  │
*                                        │              │                          │        │      Callback fn     │   FL   │                │  │
*                                        │              │                          │        │◄─────────────────────┤ Source │                │  │
*                                        │              │                          │        │                      └────────┘                │  │
*                                        │              │                          │        │                                                │  │
*                                        │              │                          │        ├────────────────────────────────────────────────┘  │
*                                        │   parse FL   │   directly call:         │   FL   │      Send borrowed funds to smart wallet          │
*                                        │     and      │   executeAction()        │ Action │                                                   │
*                                        │   execute    ├─────────────────────────►│        │                                                   │
*                                        │              │                          │        │      Call back the _executeActionsFromFL on       │
*                                        │              │                          │        │      RecipeExecutor through Smart Wallet.         │
*                                        │              │                          │        │      We can call wallet from FL action because    │
*                                        │              │                          │        │      we gave it approval earlier.                 │
*                                        │              │                          │        │      Actions are executed as regular starting     │
*                                        │              │                          │        │      from second action.                          │
*                                        │              │                          │        ├───────────────────────────────────────────────────┘
*                                        │              │                          │        │
*                                        │              │                          └────┬───┘                      ┌────────┐
*                                        │              │                               │    Return borrowed funds │External│
*                                        │              │                               └─────────────────────────►│   FL   │
*                                        │              │                                                          │ Source │
*                                        │              │                                                          └────────┘
*                                        │              │
*                                        │              │
*                                        │              │       removeWalletPermission            ┌────────────────────────┐
*                                        │              ├────────────────────────────────────────►│       Permission       │
*                                        │              │                                         └────────────────────────┘
*                                        └──────────────┘
*
*
*
*/

import { DSProxyPermission } from "../auth/DSProxyPermission.sol";
import { SafeModulePermission } from "../auth/SafeModulePermission.sol";
import { CheckWalletType } from "../utils/CheckWalletType.sol";
import { ActionBase } from "../actions/ActionBase.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { StrategyStorage } from "../core/strategy/StrategyStorage.sol";
import { BundleStorage } from "../core/strategy/BundleStorage.sol";
import { SubStorage } from "../core/strategy/SubStorage.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { TxSaverGasCostCalc } from "../utils/TxSaverGasCostCalc.sol";
import { DefisaverLogger } from "../utils/DefisaverLogger.sol";
import { DFSExchangeData } from "../exchangeV3/DFSExchangeData.sol";

import { ITrigger } from "../interfaces/ITrigger.sol";
import { IFlashLoanBase } from "../interfaces/flashloan/IFlashLoanBase.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { ITxSaverBytesTransientStorage } from "../interfaces/ITxSaverBytesTransientStorage.sol";

contract RecipeExecutor is 
    StrategyModel,
    DSProxyPermission,
    SafeModulePermission,
    AdminAuth,
    CoreHelper,
    TxSaverGasCostCalc,
    CheckWalletType
{
    bytes4 public constant TX_SAVER_EXECUTOR_ID = bytes4(keccak256("TxSaverExecutor"));
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    /// @dev Function sig of ActionBase.executeAction()
    bytes4 public constant EXECUTE_ACTION_SELECTOR = 
        bytes4(keccak256("executeAction(bytes,bytes32[],uint8[],bytes32[])"));

    using TokenUtils for address;

    /// For strategy execution all triggers must be active
    error TriggerNotActiveError(uint256);

    /// For TxSaver, total gas cost fee taken from user can't be higher than maxTxCost set by user
    error TxCostInFeeTokenTooHighError(uint256 maxTxCost, uint256 txCost);

    /// When calling TxSaver functions, caller has to be TxSaverExecutor
    error TxSaverAuthorizationError(address caller);

    /// @notice Called directly through user wallet to execute a recipe
    /// @dev This is the main entry point for Recipes executed manually
    /// @param _currRecipe Recipe to be executed
    function executeRecipe(Recipe calldata _currRecipe) public payable {
        _executeActions(_currRecipe);
    }

    /// @notice Called by TxSaverExecutor through safe wallet
    /// @param _currRecipe Recipe to be executed
    /// @param _txSaverData TxSaver data signed by user
    function executeRecipeFromTxSaver(
        Recipe calldata _currRecipe,
        TxSaverSignedData calldata _txSaverData
    ) public payable {
        address txSaverExecutorAddr = registry.getAddr(TX_SAVER_EXECUTOR_ID);

        // only TxSaverExecutor can call this function
        if (msg.sender != txSaverExecutorAddr) {
            revert TxSaverAuthorizationError(msg.sender);
        }

        // if fee is taken from position, its taken inside sell action, so here we just execute the recipe
        if (_txSaverData.shouldTakeFeeFromPosition) {
            _executeActions(_currRecipe);
            return;
        }
        
        // when taking fee from EOA/wallet
        // first read gas estimation set by TxSaverExecutor
        (uint256 estimatedGasUsed, uint256 l1GasCostInEth, ) = abi.decode(
            ITxSaverBytesTransientStorage(txSaverExecutorAddr).getBytesTransiently(),
            (uint256, uint256, DFSExchangeData.InjectedExchangeData)
        );

        // execute the recipe
        _executeActions(_currRecipe);

        // when sending sponsored tx, no tx cost is taken
        if (estimatedGasUsed == 0) {
            return;
        }

        // calculate gas cost using gas estimation and signed token price
        uint256 gasCost = calcGasCostUsingInjectedPrice(
            estimatedGasUsed,
            _txSaverData.feeToken,
            _txSaverData.tokenPriceInEth,
            l1GasCostInEth
        );

        // revert if gas cost is higher than max cost signed by user
        if (gasCost > _txSaverData.maxTxCostInFeeToken) {
            revert TxCostInFeeTokenTooHighError(_txSaverData.maxTxCostInFeeToken, gasCost);
        }

        address[] memory owners = ISafe(address(this)).getOwners();

        // if 1/1 wallet, pull tokens from eoa to wallet
        if (owners.length == 1) {
            _txSaverData.feeToken.pullTokensIfNeeded(owners[0], gasCost);
        }

        // send tokens from wallet to fee recipient
        _txSaverData.feeToken.withdrawTokens(TX_SAVER_FEE_RECIPIENT, gasCost);
    }

    /// @notice Called by user wallet through the auth contract to execute a recipe & check triggers
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
        Strategy memory strategy;

        {   // to handle stack too deep
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

        for (i = 0; i < triggerIds.length; ++i) {
            triggerAddr = registry.getAddr(triggerIds[i]);

            isTriggered = ITrigger(triggerAddr).isTriggered(
                _triggerCallData[i],
                _sub.triggerData[i]
            );

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
                returnValues[i] = _executeAction(_currRecipe, i, returnValues);
            }
        }

        /// log the recipe name
        DefisaverLogger(DEFISAVER_LOGGER).logRecipeEvent(_currRecipe.name);
    }

    /// @notice Gets the action address and executes it
    /// @dev We delegate context of user's wallet to action contract
    /// @param _currRecipe Recipe to be executed
    /// @param _index Index of the action in the recipe array
    /// @param _returnValues Return values from previous actions
    function _executeAction(
        Recipe memory _currRecipe,
        uint256 _index,
        bytes32[] memory _returnValues
    ) internal returns (bytes32 response) {

        address actionAddr = registry.getAddr(_currRecipe.actionIds[_index]);

        response = delegateCallAndReturnBytes32(
            actionAddr, 
            abi.encodeWithSelector(
                EXECUTE_ACTION_SELECTOR,
                _currRecipe.callData[_index],
                _currRecipe.subData,
                _currRecipe.paramMapping[_index],
                _returnValues
            )
        );
    }

    /// @notice Prepares and executes a flash loan action
    /// @dev It adds to the first input value of the FL, the recipe data so it can be passed on
    /// @dev FL action is executed directly, so we need to give it permission to call back RecipeExecutor in context of user's wallet
    /// @param _currRecipe Recipe to be executed
    /// @param _flActionAddr Address of the flash loan action
    /// @param _returnValues An empty array of return values, because it's the first action
    function _parseFLAndExecute(
        Recipe memory _currRecipe,
        address _flActionAddr,
        bytes32[] memory _returnValues
    ) internal {

        bool isDSProxy = isDSProxy(address(this));

        isDSProxy ? giveProxyPermission(_flActionAddr) : enableModule(_flActionAddr);

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

        isDSProxy ? removeProxyPermission(_flActionAddr) : disableModule(_flActionAddr);
    }

    /// @notice Checks if the specified address is of FL type action
    /// @param _actionAddr Address of the action
    function isFL(address _actionAddr) internal pure returns (bool) {
        return ActionBase(_actionAddr).actionType() == uint8(ActionBase.ActionType.FL_ACTION);
    }

    function delegateCallAndReturnBytes32(address _target, bytes memory _data) internal returns (bytes32 response) {
        require(_target != address(0));

        // call contract in current context
        assembly {
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
