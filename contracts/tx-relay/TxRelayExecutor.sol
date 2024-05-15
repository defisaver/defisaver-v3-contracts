// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { BotAuthForTxRelay } from "./BotAuthForTxRelay.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { DFSExchangeData } from "../exchangeV3/DFSExchangeData.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { TxRelayBytesTransientStorage } from "./TxRelayBytesTransientStorage.sol";

//TODO[TX-RELAY]: remove after testing
import { console } from "hardhat/console.sol";

/// @title Main entry point for executing tx-relay transactions signed by users through safe wallet 
contract TxRelayExecutor is 
    StrategyModel,
    AdminAuth,
    CoreHelper,
    TxRelayBytesTransientStorage
{
    bytes4 public constant BOT_AUTH_ID_FOR_TX_RELAY = bytes4(keccak256("BotAuthForTxRelay"));
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    /// Caller must be authorized bot
    error BotNotApproved(address bot);
    /// Revert if execution fails when using safe wallet
    error SafeExecutionError();

    /// @notice Data needed to execute a Safe transaction
    /// @param value Ether value of Safe transaction
    /// @param safe Address of the Safe wallet
    /// @param data Data payload of Safe transaction
    /// @param signatures Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
    struct SafeTxParams {
        uint256 value;
        address safe;
        bytes data;
        bytes signatures;
    }

    /// @notice Execute a transaction signed by user and take gas fee from EOA/wallet
    /// @notice If wallet is 1/1, gas fee is taken from eoa
    /// @notice If wallet is n/m, gas fee is taken from wallet itself
    ///
    /// @param _params SafeTxParams data needed to execute safe tx
    /// @param _additionalGasUsed When estimating gas usage, we need to include gas for taking fee (transfer from EOA if 1/1 wallet) + sending fee to fee recipient
    /// @param _percentageOfLoweringTxCost Percentage to lower total tx cost
    ///
    /// @dev When executing complex transactions, gas refund can go up to 20%. We can't get exact amount of gas refund on-chain, so we estimate it when sending tx  
    /// @dev For complex transactions, this makes sure we don't take much more gas than tx actually consumes
    /// @dev _additionalGasUsed & _percentageOfLoweringTxCost are sent from backend, they are not part of user signature
    function executeTxTakingFeeFromEoaOrWallet(
        SafeTxParams calldata _params,
        uint256 _additionalGasUsed,
        uint256 _percentageOfLoweringTxCost
    ) external {
        uint256 gasStartRoot = gasleft();

        _botCallerValidation();

        uint256 gasFullSafeTx = gasleft();

        {   
            /// @dev Include EIP-150 gas calculation, so we can estimate gas used
            // Include gas for transient storage and call opcode
            uint256 gasAvailable = gasleft() - 7000;

            // 63/64 of available gas will be transferred to safe proxy contract
            uint256 gasLostInSafeProxy = gasAvailable / 64;
            
            // 63/64 of gas from safe proxy will be transferred to safe singleton
            uint256 gasLostInSafeSingleton = (gasAvailable * 63 / 64) / 64; 
            
            uint256 totalGasLost = gasLostInSafeProxy + gasLostInSafeSingleton;
            
            console.log("Gas lost because of EIP150: %d", totalGasLost);

            // store initial gas and gas lost because of EIP150 so we can calculate gas used
            // this values are read inside recipe executor
            setBytesTransiently(
                abi.encode(
                    gasStartRoot,
                    totalGasLost,
                    _additionalGasUsed,
                    _percentageOfLoweringTxCost
                ),
                false
            );
        }
        
        _executeSafeTx(_params);
        
        gasFullSafeTx = gasFullSafeTx - gasleft();
        uint256 gasEndRoot = gasleft();

        console.log("Gas start root: %d", gasStartRoot);
        console.log("Before full safe tx: %d", gasStartRoot - gasFullSafeTx);
        console.log("Safe total execution: %d", gasFullSafeTx);
        console.log("Total gas used on contract: %d", gasStartRoot - gasEndRoot);
    }

    /// @notice Execute a transaction signed by user and take gas fee from user position
    /// @param _params SafeTxParams data needed to execute safe tx
    /// @param _estimatedGas Estimated gas usage for the transaction
    /// @param _offchainOrder If user signed allowance for offchain order injection, it's included here, otherwise it's empty
    /// @dev gas fee is taken inside DFSSell action. Right now, we only support fee taking from position if recipe has sell action
    function executeTxTakingFeeFromPosition(
        SafeTxParams calldata _params,
        uint256 _estimatedGas,
        DFSExchangeData.OffchainData calldata _offchainOrder
    ) external {
        _botCallerValidation();

        (, TxRelaySignedData memory txRelayData) = parseTxRelaySignedData(_params.data);

        /// @dev read by DFSSell action
        setBytesTransiently(abi.encode(_estimatedGas, txRelayData, _offchainOrder), true);

        _executeSafeTx(_params);
    }

    function _executeSafeTx(SafeTxParams memory _params) internal {
        bool success = ISafe(_params.safe).execTransaction(
            registry.getAddr(RECIPE_EXECUTOR_ID), // TODO[TX-RELAY]: maybe hardcode once deployed
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

    function _botCallerValidation() internal view {
        if (!BotAuthForTxRelay(registry.getAddr(BOT_AUTH_ID_FOR_TX_RELAY)).isApproved(msg.sender)) {
            revert BotNotApproved(msg.sender);
        }
    }

    function parseTxRelaySignedData(bytes calldata _data) 
        public pure returns (Recipe memory recipe, TxRelaySignedData memory txRelayData)
    {
        (recipe, txRelayData) = abi.decode(_data[4:], (Recipe, TxRelaySignedData)); 
    }
}
