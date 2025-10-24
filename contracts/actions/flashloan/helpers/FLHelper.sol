// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISafe } from "../../../interfaces/safe/ISafe.sol";
import { IDSProxy } from "../../../interfaces/IDSProxy.sol";
import { IDFSRegistry } from "../../../interfaces/IDFSRegistry.sol";
import { DSAUtils } from "../../../utils/DSAUtils.sol";
import { MainnetFLAddresses } from "./MainnetFLAddresses.sol";
import { FLFeeFaucet } from "../../../utils/FLFeeFaucet.sol";
import { StrategyModel } from "../../../core/strategy/StrategyModel.sol";
import { WalletType } from "../../../utils/DFSTypes.sol";

/// @notice Helper contract containing common functions for flashloan actions
contract FLHelper is MainnetFLAddresses, StrategyModel {
    uint16 internal constant AAVE_REFERRAL_CODE = 64;
    uint16 internal constant SPARK_REFERRAL_CODE = 0;

    FLFeeFaucet internal constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR =
        bytes4(keccak256("_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"));

    /// @dev Id of the RecipeExecutor contract
    bytes4 private constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    // Revert if execution fails when using safe wallet
    error SafeExecutionError();

    /// @notice Helper function to callback RecipeExecutor from FL contract
    /// @param _wallet Address of the wallet from which to callback RecipeExecutor
    /// @param _walletType Type of the wallet used
    /// @param _currRecipe Recipe to be executed
    /// @param _paybackAmount Payback flashloan amount including fees
    function _executeRecipe(address _wallet, WalletType _walletType, Recipe memory _currRecipe, uint256 _paybackAmount)
        internal
    {
        address target = IDFSRegistry(DFS_REGISTRY_ADDR).getAddr(RECIPE_EXECUTOR_ID);
        bytes memory data = abi.encodeWithSelector(CALLBACK_SELECTOR, _currRecipe, _paybackAmount);

        if (_walletType == WalletType.DSPROXY) {
            IDSProxy(_wallet).execute{ value: address(this).balance }(target, data);

            return;
        }

        if (_walletType == WalletType.DSAPROXY) {
            DSAUtils.cast(
                _wallet,
                DFS_REGISTRY_ADDR,
                address(this), // Only used for event logging, so here we will set it to the FL contract
                data,
                address(this).balance
            );

            return;
        }

        // Otherwise, we assume we are in context of Safe
        bool success =
            ISafe(_wallet).execTransactionFromModule(target, address(this).balance, data, ISafe.Operation.DelegateCall);

        if (!success) {
            revert SafeExecutionError();
        }
    }
}
