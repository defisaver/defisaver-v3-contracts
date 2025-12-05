// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IRecipeExecutor } from "../../../interfaces/core/IRecipeExecutor.sol";
import { ISafe } from "../../../interfaces/protocols/safe/ISafe.sol";
import { IDSProxy } from "../../../interfaces/DS/IDSProxy.sol";
import { IDFSRegistry } from "../../../interfaces/core/IDFSRegistry.sol";
import {
    IAccountImplementation
} from "../../../interfaces/protocols/summerfi/IAccountImplementation.sol";
import { IInstaAccountV2 } from "../../../interfaces/protocols/insta/IInstaAccountV2.sol";
import { MainnetFLAddresses } from "./MainnetFLAddresses.sol";
import { FLFeeFaucet } from "../../../utils/fee/FLFeeFaucet.sol";
import { StrategyModel } from "../../../core/strategy/StrategyModel.sol";
import { WalletType } from "../../../utils/DFSTypes.sol";
import { DFSIds } from "../../../utils/DFSIds.sol";

/// @notice Helper contract containing common functions for flashloan actions
contract FLHelper is MainnetFLAddresses, StrategyModel {
    uint16 internal constant AAVE_REFERRAL_CODE = 64;
    uint16 internal constant SPARK_REFERRAL_CODE = 64;
    string internal constant DEFISAVER_CONNECTOR_ID = "DEFI-SAVER-A";
    FLFeeFaucet internal constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);

    // Revert if execution fails when using safe wallet
    error SafeExecutionError();

    /// @notice Helper function to callback RecipeExecutor from FL contract
    /// @param _wallet Address of the wallet from which to callback RecipeExecutor
    /// @param _walletType Type of the wallet used
    /// @param _currRecipe Recipe to be executed
    /// @param _paybackAmount Payback flashloan amount including fees
    function _executeRecipe(
        address _wallet,
        WalletType _walletType,
        Recipe memory _currRecipe,
        uint256 _paybackAmount
    ) internal {
        address target = IDFSRegistry(DFS_REGISTRY_ADDR).getAddr(DFSIds.RECIPE_EXECUTOR);
        bytes memory data = abi.encodeWithSelector(
            IRecipeExecutor.executeActionsFromFL.selector, _currRecipe, _paybackAmount
        );

        if (_walletType == WalletType.DSPROXY) {
            IDSProxy(_wallet).execute{ value: address(this).balance }(target, data);

            return;
        }

        if (_walletType == WalletType.DSAPROXY) {
            string[] memory connectors = new string[](1);
            connectors[0] = DEFISAVER_CONNECTOR_ID;

            bytes[] memory connectorsData = new bytes[](1);
            connectorsData[0] = data;

            IInstaAccountV2(_wallet).cast{ value: address(this).balance }(
                connectors,
                connectorsData,
                address(this) // Only used for event logging, so here we will set it to the FL contract
            );

            return;
        }

        if (_walletType == WalletType.SFPROXY) {
            IAccountImplementation(_wallet).execute{ value: address(this).balance }(target, data);

            return;
        }

        // Otherwise, we assume we are in context of Safe
        bool success = ISafe(_wallet)
            .execTransactionFromModule(
                target, address(this).balance, data, ISafe.Operation.DelegateCall
            );

        if (!success) {
            revert SafeExecutionError();
        }
    }
}
