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
        uint256 gasStartRoot = gasleft();
        console.log("Gas start root: %d", gasStartRoot);
        
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

        uint256 gasFullSafeTx = gasleft();
        console.log("Before full safe tx: %d", gasStartRoot - gasFullSafeTx);
        
        _executeSafeTx(_params, gasStartRoot);
        
        gasFullSafeTx = gasFullSafeTx - gasleft();
        console.log("Safe total execution: %d", gasFullSafeTx);
        
        uint256 gasEndRoot = gasleft();
        console.log("Total gas used on contract: %d", gasStartRoot - gasEndRoot);
    }

    function _executeSafeTx(SafeTxParams memory _params, uint256 _gasStart) internal {
        address recipeAddr = registry.getAddr(RECIPE_EXECUTOR_ID);
        
        {   
            /// @dev We include EIP 150 gas calculation, so we can estimate gas used
            // we need to cover gas for setting transient storage and call opcode itself
            // check this value if more accurate estimation is needed
            uint256 gasAvailableAfterCall = gasleft() - 7000;

            // 63/64 of available gas will be transferred to safe proxy contract
            uint256 gasLostInSafeProxy = gasAvailableAfterCall / 64;
            
            // 63/64 of gas from safe proxy will be transferred to safe singleton
            uint256 gasLostInSafeSingleton = (gasAvailableAfterCall * 63 / 64) / 64; 
            
            uint256 totalGasLost = gasLostInSafeProxy + gasLostInSafeSingleton;
            
            console.log("Gas lost because of EIP150: %d", totalGasLost);

            // store initial gas and gas lost because of EIP150 so we can calculate gas used
            // this values are read by the recipe executor
            transientStorage.setBytesTransiently(abi.encode(_gasStart, totalGasLost));
        }

        bool success = ISafe(_params.safe).execTransaction(
            recipeAddr, // hardcode it later
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
