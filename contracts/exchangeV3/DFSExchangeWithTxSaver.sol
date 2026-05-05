// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/token/IERC20.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import {
    ITxSaverBytesTransientStorage
} from "../interfaces/core/ITxSaverBytesTransientStorage.sol";

import { DFSExchangeCore } from "./DFSExchangeCore.sol";
import { SafeERC20 } from "../_vendor/openzeppelin/SafeERC20.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { UtilAddresses } from "../utils/addresses/UtilAddresses.sol";
import { DFSIds } from "../utils/DFSIds.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { GasCostLib } from "../actions/fee/helpers/GasCostLib.sol";

/// @title DFSExchangeWithTxSaver
/// @notice Contract containing the logic for performing swaps with optional TxSaver functionality.
contract DFSExchangeWithTxSaver is DFSExchangeCore, UtilAddresses, StrategyModel {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @notice Flag for checking if fee is taken from EOA or wallet.
    /// @dev See TxSaverBytesTransientStorage for more details.
    uint256 private constant EOA_OR_WALLET_FEE_FLAG = 2;

    /// @notice For TxSaver, total gas cost fee taken from user can't be higher than maxTxCost set by user
    /// @param maxTxCost Maximum gas cost fee allowed
    /// @param txCost Total gas cost fee taken
    error TxCostInFeeTokenTooHighError(uint256 maxTxCost, uint256 txCost);

    /// @notice Fee token must be the same as the source token
    /// @param srcToken Source token address
    /// @param feeToken Fee token address
    error FeeTokenNotSameAsSrcToken(address srcToken, address feeToken);

    /// @notice Sells the source token and takes the TxSaver fee if applicable.
    /// @param _exData Exchange data
    /// @param _user User address
    /// @param _registry DFS registry address
    /// @return wrapperAddress Address of the wrapper used
    /// @return destAmount Amount of destination token received
    /// @return hasFee Whether the regular sell fee was taken
    /// @return txSaverFeeTaken Whether the TxSaver fee was taken
    function _sellWithTxSaverChoice(
        ExchangeData memory _exData,
        address _user,
        IDFSRegistry _registry
    )
        internal
        returns (address wrapperAddress, uint256 destAmount, bool hasFee, bool txSaverFeeTaken)
    {
        address txSaverAddr = _registry.getAddr(DFSIds.TX_SAVER_EXECUTOR);
        ITxSaverBytesTransientStorage tStorage = ITxSaverBytesTransientStorage(txSaverAddr);

        // Check if TxSaverExecutor initiated transaction by setting right flag in transient storage.
        // We can't just check for msg.sender, as that wouldn't work for flashloan actions.
        // If no txSaverAddr is registered for this chain, default to regular sell.
        uint256 feeType = (txSaverAddr != address(0)) ? tStorage.getFeeType() : 0;

        // If not initiated by TxSaverExecutor, perform regular sell.
        if (feeType == 0) {
            txSaverFeeTaken = false;
            (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
            return (wrapperAddress, destAmount, hasFee, txSaverFeeTaken);
        }

        // Read the data from transient storage. Data is written inside TxSaverExecutor.
        (
            uint256 estimatedGas,
            uint256 l1GasCostInEth,
            TxSaverSignedData memory txSaverData,
            InjectedExchangeData memory injectedExchangeData
        ) = _readDataFromTransientStorage(feeType, tStorage);

        // Store the amount without fee for later rollback.
        uint256 amountWithoutFee = _exData.srcAmount;

        // To improve the route, inject the exchange data from transient storage if present.
        _injectExchangeData(_exData, injectedExchangeData);

        // When taking fee from EOA/wallet, perform regular sell as fee will be taken inside the `RecipeExecutor:executeRecipeFromTxSaver`.
        if (feeType == EOA_OR_WALLET_FEE_FLAG) {
            txSaverFeeTaken = false;
            (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
            return (wrapperAddress, destAmount, hasFee, txSaverFeeTaken);
        }

        // Take the TxSaver gas fee before performing the regular sell.
        _takeTxSaverFee(_exData, txSaverData, estimatedGas, l1GasCostInEth);
        txSaverFeeTaken = true;

        // Perform the regular sell.
        (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);

        // Rollback exData changes to keep it consistent.
        _exData.srcAmount = amountWithoutFee;
    }

    /// @notice Injects the exchange data from transient storage if present.
    /// @param _exData Exchange data
    /// @param _injectedExchangeData Injected exchange data
    /// @dev Order of execution:
    /// 1. Both off-chain and on-chain orders are injected:
    ///    - Try the off-chain injected order first → then fall back to the on-chain injected order
    /// 2. Only an off-chain order is injected:
    ///    - Try the off-chain injected order first → then fall back to an existing on-chain order (if present)
    /// 3. Only an on-chain order is injected:
    ///    - Try the existing off-chain order first → then fall back to the on-chain injected order
    /// 4. No orders are injected:
    ///    - Try the existing off-chain order first → then fall back to the existing on-chain order (if present)
    function _injectExchangeData(
        ExchangeData memory _exData,
        InjectedExchangeData memory _injectedExchangeData
    ) internal pure {
        // If off-chain order data is present, inject it here.
        if (_injectedExchangeData.offchainData.price > 0) {
            _exData.offchainData = _injectedExchangeData.offchainData;
        }

        // If on-chain order data is present, inject it here.
        // We do not clear any existing off-chain order, as it should be tried first.
        if (_injectedExchangeData.wrapper != address(0)) {
            _exData.wrapper = _injectedExchangeData.wrapper;
            _exData.wrapperData = _injectedExchangeData.wrapperData;
        }
    }

    /// @notice Reads the data from transient storage.
    /// @param _feeType Fee type
    /// @param _tStorage Transient storage
    /// @return estimatedGas Estimated gas used
    /// @return l1GasCostInEth Additional L1 gas cost
    /// @return txSaverData TxSaver signed data
    /// @return injectedExchangeData Injected exchange data
    /// @dev When taking fee from EOA/wallet, TxSaverSignedData is not present in the transient storage.
    function _readDataFromTransientStorage(
        uint256 _feeType,
        ITxSaverBytesTransientStorage _tStorage
    )
        internal
        view
        returns (
            uint256 estimatedGas,
            uint256 l1GasCostInEth,
            TxSaverSignedData memory txSaverData,
            InjectedExchangeData memory injectedExchangeData
        )
    {
        if (_feeType == EOA_OR_WALLET_FEE_FLAG) {
            (estimatedGas, l1GasCostInEth, injectedExchangeData) = abi.decode(
                _tStorage.getBytesTransiently(), (uint256, uint256, InjectedExchangeData)
            );
        } else {
            (estimatedGas, l1GasCostInEth, txSaverData, injectedExchangeData) = abi.decode(
                _tStorage.getBytesTransiently(),
                (uint256, uint256, TxSaverSignedData, InjectedExchangeData)
            );
        }
    }

    /// @notice Takes the TxSaver gas fee before performing the regular sell.
    /// @param _exData Exchange data
    /// @param _txSaverData TxSaver signed data
    /// @param _estimatedGas Estimated gas used
    /// @param _l1GasCostInEth Additional L1 gas cost
    function _takeTxSaverFee(
        ExchangeData memory _exData,
        TxSaverSignedData memory _txSaverData,
        uint256 _estimatedGas,
        uint256 _l1GasCostInEth
    ) internal {
        // When sending sponsored tx, no tx cost is taken.
        if (_estimatedGas == 0) return;

        // Calculate the gas cost in the source token. Use injected ETH price to convert to source token amount.
        uint256 txCostInSrcToken = GasCostLib.calcGasCost(
            _estimatedGas, _exData.srcAddr, _txSaverData.tokenPriceInEth, _l1GasCostInEth, true
        );

        // Revert if the tx cost is higher than the max value set by the user.
        if (txCostInSrcToken > _txSaverData.maxTxCostInFeeToken) {
            revert TxCostInFeeTokenTooHighError(_txSaverData.maxTxCostInFeeToken, txCostInSrcToken);
        }

        // Revert if the fee token is not the same as the source token.
        if (_exData.srcAddr != _txSaverData.feeToken) {
            revert FeeTokenNotSameAsSrcToken(_exData.srcAddr, _txSaverData.feeToken);
        }

        // Subtract the tx gas fee cost from the source amount and send it to the fee recipient.
        _exData.srcAmount -= txCostInSrcToken;
        _exData.srcAddr.withdrawTokens(TX_SAVER_FEE_RECIPIENT, txCostInSrcToken);
    }
}
