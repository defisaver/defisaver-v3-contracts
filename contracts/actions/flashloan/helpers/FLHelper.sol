// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;


import { ISafe } from "../../../interfaces/safe/ISafe.sol";
import { IDSProxy } from "../../../interfaces/IDSProxy.sol";
import { IInstaAccountV2 } from "../../../interfaces/insta/IInstaAccountV2.sol";
import { IAccountImplementation } from "../../../interfaces/summerfi/IAccountImplementation.sol";

import { MainnetFLAddresses } from "./MainnetFLAddresses.sol";
import { FLFeeFaucet } from "../../../utils/FLFeeFaucet.sol";
import { StrategyModel } from "../../../core/strategy/StrategyModel.sol";
import { DFSRegistry } from "../../../core/DFSRegistry.sol";
import { WalletType } from "../../../utils/DFSTypes.sol";

contract FLHelper is MainnetFLAddresses, StrategyModel {
    uint16 internal constant AAVE_REFERRAL_CODE = 64;
    uint16 internal constant SPARK_REFERRAL_CODE = 0;

    FLFeeFaucet public constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);
    DFSRegistry public constant dfsRegistry = DFSRegistry(DFS_REGISTRY_ADDR);

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR =
        bytes4(
            keccak256(
                "_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"
            )
        );

    /// @dev Id of the RecipeExecutor contract
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    /// @dev Used for DSA Proxy Accounts
    string private constant DEFISAVER_CONNECTOR_NAME = "DefiSaverConnector";

    // Revert if execution fails when using safe wallet
    error SafeExecutionError();

    function _executeRecipe(address _wallet, WalletType _walletType, Recipe memory _currRecipe, uint256 _paybackAmount) internal {
        bytes memory data = abi.encodeWithSelector(CALLBACK_SELECTOR, _currRecipe, _paybackAmount);

        if (_walletType == WalletType.DSPROXY) {
            IDSProxy(_wallet).execute{value: address(this).balance}(
                dfsRegistry.getAddr(RECIPE_EXECUTOR_ID),
                data
            );
            return;
        }
        
        if (_walletType == WalletType.DSAPROXY) {
            string[] memory connectors = new string[](1);
            connectors[0] = DEFISAVER_CONNECTOR_NAME;

            bytes[] memory connectorsData = new bytes[](1);
            connectorsData[0] = data;

            // Origin will only be used for event logging, so here we will set it to the FL contract
            address origin = address(this);

            IInstaAccountV2(_wallet).cast{value: address(this).balance}(
                connectors,
                connectorsData,
                origin
            );
            return;
        }

        if (_walletType == WalletType.SUMMERFI) {
            IAccountImplementation(_wallet).execute{value: address(this).balance}(
                dfsRegistry.getAddr(RECIPE_EXECUTOR_ID),
                data
            );
            return;
        }
        
        // Otherwise, we assume we are in context of Safe
        bool success = ISafe(_wallet).execTransactionFromModule(
            dfsRegistry.getAddr(RECIPE_EXECUTOR_ID),
            address(this).balance,
            data,
            ISafe.Operation.DelegateCall
        );
        
        if (!success) {
            revert SafeExecutionError();
        }
    }
}