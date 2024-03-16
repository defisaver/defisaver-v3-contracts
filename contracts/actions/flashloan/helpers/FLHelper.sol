// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./MainnetFLAddresses.sol";
import "../../../utils/FLFeeFaucet.sol";
import "../../../core/strategy/StrategyModel.sol";
import "../../../interfaces/safe/ISafe.sol";
import "../../../interfaces/IDSProxy.sol";


contract FLHelper is MainnetFLAddresses, StrategyModel {
    uint16 internal constant AAVE_REFERRAL_CODE = 64;
    uint16 internal constant SPARK_REFERRAL_CODE = 0;

    FLFeeFaucet public constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR =
        bytes4(
            keccak256(
                "_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"
            )
        );

    // Revert if execution fails when using safe wallet
    error SafeExecutionError();

    function _executeRecipe(address _wallet, bool _isDSProxy, Recipe memory _currRecipe, uint256 _paybackAmount) internal {
        if (_isDSProxy) {
            IDSProxy(_wallet).execute{value: address(this).balance}(
                RECIPE_EXECUTOR_ADDR,
                abi.encodeWithSelector(CALLBACK_SELECTOR, _currRecipe, _paybackAmount)
            );
        } else {
            bool success = ISafe(_wallet).execTransactionFromModule(
                RECIPE_EXECUTOR_ADDR,
                address(this).balance,
                abi.encodeWithSelector(CALLBACK_SELECTOR, _currRecipe, _paybackAmount),
                ISafe.Operation.DelegateCall
            );

            if (!success) {
                revert SafeExecutionError();
             }
        }
    }
}