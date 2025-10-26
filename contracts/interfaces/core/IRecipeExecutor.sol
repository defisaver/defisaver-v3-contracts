// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { StrategyModel } from "../../core/strategy/StrategyModel.sol";

interface IRecipeExecutor {
    function executeRecipe(StrategyModel.Recipe calldata _currRecipe) external payable;

    function executeRecipeFromTxSaver(
        StrategyModel.Recipe calldata _currRecipe,
        StrategyModel.TxSaverSignedData calldata _txSaverData
    ) external payable;

    function executeRecipeFromStrategy(
        uint256 _subId,
        bytes[] calldata _actionCallData,
        bytes[] calldata _triggerCallData,
        uint256 _strategyIndex,
        StrategyModel.StrategySub memory _sub
    ) external payable;

    function executeActionsFromFL(StrategyModel.Recipe calldata _currRecipe, bytes32 _flAmount) external payable;
}
