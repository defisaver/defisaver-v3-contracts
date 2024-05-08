// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { ISafe } from "../interfaces/safe/ISafe.sol";
import { IBytesTransientStorage } from "../interfaces/IBytesTransientStorage.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { SupportedFeeTokensRegistry } from "./SupportedFeeTokensRegistry.sol";
import { BotAuthForTxRelay } from "./BotAuthForTxRelay.sol";
import { CoreHelper } from "../core/helpers/CoreHelper.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { MainnetTxRelayAddresses } from "./MainnetTxRelayAddresses.sol";
import { console } from "hardhat/console.sol";
 
contract TxRelayExecutor is 
    StrategyModel,
    AdminAuth,
    CoreHelper,
    MainnetTxRelayAddresses
{
    uint256 public constant SANITY_GAS_PRICE = 1000 gwei;
    bytes4 public constant BOT_AUTH_ID_FOR_TX_RELAY = bytes4(keccak256("BotAuthForTxRelay"));
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);
    IBytesTransientStorage public constant transientStorage = IBytesTransientStorage(BYTES_TRANSIENT_STORAGE);

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

    /// @notice Execute a transaction using fee tokens.
    /// @notice If wallet is 1/1, fee is taken from eoa
    /// @notice if wallet is n/n, fee is taken from wallet
    /// @param _params SafeTxParams data needed to execute safe tx
    /// @param _additionalGasUsed When estimating gas usage, we need to include gas for taking fee (1 transfer if wallet is 1/1) + sending fee to fee recipient
    /// @dev _additionalGasUsed is sent from backend, and it's not part of user signature
    function executeTxTakingFeeFromEoaOrWallet(
        SafeTxParams calldata _params,
        uint256 _additionalGasUsed
    ) external {
        uint256 gasStartRoot = gasleft();
        console.log("Gas start root: %d", gasStartRoot);

        _botCallerValidation();

        TxRelayUserSignedData memory txRelayData = _parseTxRelayData(_params);        

        if (tx.gasprice > txRelayData.maxGasPrice) {
            revert GasPriceTooHigh(txRelayData.maxGasPrice, tx.gasprice);
        }

        uint256 gasFullSafeTx = gasleft();
        console.log("Before full safe tx: %d", gasStartRoot - gasFullSafeTx);

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
            transientStorage.setBytesTransiently(abi.encode(gasStartRoot, totalGasLost, _additionalGasUsed));
        }
        
        _executeSafeTx(_params);
        
        gasFullSafeTx = gasFullSafeTx - gasleft();
        console.log("Safe total execution: %d", gasFullSafeTx);
        
        uint256 gasEndRoot = gasleft();
        console.log("Total gas used on contract: %d", gasStartRoot - gasEndRoot);
    }

    function executeTxTakingFeeFromPosition(
        
    ) external {

    }

    // TODO:: allow to inject order from backend later
    function executeTxWithoutFee(
        SafeTxParams calldata _params
    ) external {
        _botCallerValidation();

        if (tx.gasprice > SANITY_GAS_PRICE) {
            revert GasPriceTooHigh(SANITY_GAS_PRICE, tx.gasprice);
        }

        _executeSafeTx(_params);
    }

    function _executeSafeTx(SafeTxParams memory _params) internal {
        bool success = ISafe(_params.safe).execTransaction(
            registry.getAddr(RECIPE_EXECUTOR_ID), // TODO: hardcode it later
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

    function _parseTxRelayData(SafeTxParams calldata _params) internal pure returns (TxRelayUserSignedData memory txRelayData) {
        Recipe memory recipe;
        (recipe, txRelayData) = abi.decode(_params.data[4:], (Recipe, TxRelayUserSignedData)); 
    }
}
