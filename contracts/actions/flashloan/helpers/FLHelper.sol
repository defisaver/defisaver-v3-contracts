// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetFLAddresses } from "./MainnetFLAddresses.sol";
import { FLFeeFaucet } from "../../../utils/FLFeeFaucet.sol";
import { ISafe } from "../../../interfaces/safe/ISafe.sol";
import { IDSProxy } from "../../../interfaces/IDSProxy.sol";
import { IRecipeExecutor } from "../../../interfaces/core/IRecipeExecutor.sol";

contract FLHelper is MainnetFLAddresses {
    uint16 internal constant AAVE_REFERRAL_CODE = 64;
    uint16 internal constant SPARK_REFERRAL_CODE = 0;

    FLFeeFaucet public constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);

    // Revert if execution fails when using safe wallet
    error SafeExecutionError();

    function _executeRecipe(
        address _wallet,
        bool _isDSProxy,
        bool _isEip7702RecipeExecutor,
        IRecipeExecutor.Recipe memory _currRecipe,
        uint256 _paybackAmount
    ) internal {
        // 1st Case - _wallet is EOA with EIP-7702 RecipeExecutor attached code
        if (_isEip7702RecipeExecutor) {
            IRecipeExecutor(_wallet)._executeActionsFromFL(
                _currRecipe,
                bytes32(_paybackAmount)
            );

            return;
        }

        bytes memory encodedCall = abi.encodeCall(
            IRecipeExecutor._executeActionsFromFL,
            (_currRecipe, bytes32(_paybackAmount))
        );

        // 2nd Case - _wallet is DSProxy smart wallet
        if (_isDSProxy) {
            IDSProxy(_wallet).execute{ value: address(this).balance }(
                RECIPE_EXECUTOR_ADDR,
                encodedCall
            );

            return;
        }

        // 3rd Case - _wallet is Safe smart wallet
        bool success = ISafe(_wallet).execTransactionFromModule(
            RECIPE_EXECUTOR_ADDR,
            address(this).balance,
            encodedCall,
            ISafe.Operation.DelegateCall
        );

        if (!success) {
            revert SafeExecutionError();
        }
    }
}