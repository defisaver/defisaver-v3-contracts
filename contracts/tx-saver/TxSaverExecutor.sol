// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { BotAuthForTxSaver } from "./BotAuthForTxSaver.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { DFSExchangeData } from "../exchangeV3/DFSExchangeData.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { TxSaverBytesTransientStorage } from "./TxSaverBytesTransientStorage.sol";

/// @title Main entry point for executing TxSaver transactions signed by users through safe wallet 
contract TxSaverExecutor is 
    StrategyModel,
    AdminAuth,
    CoreHelper,
    TxSaverBytesTransientStorage
{
    bytes4 public constant BOT_AUTH_ID_FOR_TX_SAVER = bytes4(keccak256("BotAuthForTxSaver"));
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    /// Caller must be authorized bot
    error BotNotApproved(address bot);
    /// Revert if execution fails when using safe wallet
    error SafeExecutionError();
    /// Revert if signature is expired
    error TxSaverSignatureExpired(uint256 deadline, uint256 currentTimestamp);

    /// @notice Data needed to execute a Safe transaction
    /// @param safe Address of the Safe wallet
    /// @param refundReceiver Injected address to track safe points
    /// @param data Data payload of Safe transaction
    /// @param signatures Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
    struct SafeTxParams {
        address safe;
        address refundReceiver;
        bytes data;
        bytes signatures;
    }

    /// @notice Execute a TxSaver transaction signed by user
    /// @notice When taking fee from position, gas fee is taken inside sell action.
    /// @notice Right now, we only support fee taking from position if recipe has sell action
    ///
    /// @notice when fee is taken from EOA/wallet:
    /// @notice If wallet is 1/1, gas fee is taken from eoa
    /// @notice If wallet is n/m, gas fee is taken from wallet itself
    ///
    /// @param _params SafeTxParams data needed to execute safe tx
    /// @param _estimatedGas Estimated gas usage for the transaction
    /// @param _l1GasCostInEth Additional gas cost added for Optimism based L2s
    /// @param _injectedExchangeData Exchange data injected by backend
    function executeTx(
        SafeTxParams calldata _params,
        uint256 _estimatedGas,
        uint256 _l1GasCostInEth,
        DFSExchangeData.InjectedExchangeData calldata _injectedExchangeData
    ) external {
        // only authorized bot can call this function
        if (!BotAuthForTxSaver(registry.getAddr(BOT_AUTH_ID_FOR_TX_SAVER)).isApproved(msg.sender)) {
            revert BotNotApproved(msg.sender);
        }

        (, TxSaverSignedData memory txSaverData) = parseTxSaverSignedData(_params.data);

        // check if signature is expired
        if (txSaverData.deadline > 0 && block.timestamp > txSaverData.deadline) {
            revert TxSaverSignatureExpired(txSaverData.deadline, block.timestamp);
        }

        if (txSaverData.shouldTakeFeeFromPosition) {
            setBytesTransiently(
                abi.encode(_estimatedGas, _l1GasCostInEth, txSaverData, _injectedExchangeData),
                txSaverData.shouldTakeFeeFromPosition
            );
        } else {
            setBytesTransiently(
                abi.encode(_estimatedGas, _l1GasCostInEth, _injectedExchangeData),
                txSaverData.shouldTakeFeeFromPosition
            );
        }

        _executeSafeTx(_params);
    }

    function _executeSafeTx(SafeTxParams memory _params) internal {
        bool success = ISafe(_params.safe).execTransaction(
            registry.getAddr(RECIPE_EXECUTOR_ID),
            0, // value
            _params.data,
            ISafe.Operation.DelegateCall,
            0, // safeTxGas,
            0, // baseGas
            0, // gasPrice
            address(0), // gasToken
            payable(_params.refundReceiver),
            _params.signatures 
        );
        if (!success) {
            revert SafeExecutionError();
        }
    }

    function parseTxSaverSignedData(bytes calldata _data) 
        public pure returns (Recipe memory recipe, TxSaverSignedData memory txSaverData)
    {
        (recipe, txSaverData) = abi.decode(_data[4:], (Recipe, TxSaverSignedData)); 
    }
}
