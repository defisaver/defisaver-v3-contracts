// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { ISafe } from "../interfaces/safe/ISafe.sol";
import { IBytesTransientStorage } from "../interfaces/IBytesTransientStorage.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { SupportedFeeTokensRegistry } from "./SupportedFeeTokensRegistry.sol";
import { BotAuth } from "../core/strategy/BotAuth.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";

import { console } from "hardhat/console.sol";
 
contract TxRelayExecutor is 
    StrategyModel,
    AdminAuth,
    CoreHelper
{

    bytes4 public constant BOT_AUTH_ID = bytes4(keccak256("BotAuth"));
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);
    IBytesTransientStorage public constant transientStorage = IBytesTransientStorage(0xB3FE6f712c8B8c64CD2780ce714A36e7640DDf0f);

    SupportedFeeTokensRegistry public immutable feeTokensRegistry;

    /// Caller must be authorized bot
    error BotNotApproved(address bot);

    /// Revert if execution fails when using safe wallet
    error SafeExecutionError();
    
    /// Gas price can't be higher than maxGasPrice
    error GasPriceTooHigh(uint256 maxGasPrice, uint256 gasPrice);

    struct SafeTxParams {
        uint256 value; // Ether value of Safe transaction
        address safe; // Address of the Safe wallet
        bytes data; // Data payload of Safe transaction
        bytes signatures; // Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
    }

    constructor(address _supportedFeeTokensRegistry) {
        feeTokensRegistry = SupportedFeeTokensRegistry(_supportedFeeTokensRegistry);
    }

    function executeTxUsingFeeTokens(
        SafeTxParams calldata _params
    ) external {
        uint256 gasStart = gasleft();
        console.log("Gas start: %d", gasStart);
        transientStorage.setBytesTransiently(abi.encode(gasStart));

        (
            Recipe memory recipe,
            TxRelayUserSignedData memory txRelayData
        ) = abi.decode(_params.data[4:], (Recipe, TxRelayUserSignedData)); 

        if (!BotAuth(registry.getAddr(BOT_AUTH_ID)).isApproved(0, msg.sender)) {
            revert BotNotApproved(msg.sender);
        }

        if (tx.gasprice > txRelayData.maxGasPrice) {
            revert GasPriceTooHigh(txRelayData.maxGasPrice, tx.gasprice);
        }

        _executeSafeTx(_params);
    }

    function _executeSafeTx(SafeTxParams memory _params) internal {
        bool success = ISafe(_params.safe).execTransaction(
            registry.getAddr(RECIPE_EXECUTOR_ID), // hardcode it later
            _params.value,
            _params.data,
            ISafe.Operation.DelegateCall,
            0, // safeTxGas, 
            0, // baseGas
            0, // gasPrice
            address(0), // gasToken
            payable(address(0)), // refundReceiver
            _params.signatures 
        );
        if (!success) {
            revert SafeExecutionError();
        }
    }
}
