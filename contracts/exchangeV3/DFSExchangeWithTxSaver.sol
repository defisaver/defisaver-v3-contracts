// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DFSExchangeCore } from "./DFSExchangeCore.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { TxSaverGasCostCalc } from "../utils/TxSaverGasCostCalc.sol";
import { ITxSaverBytesTransientStorage } from "../interfaces/ITxSaverBytesTransientStorage.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";

contract DFSExchangeWithTxSaver is DFSExchangeCore, TxSaverGasCostCalc
{   
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    bytes4 internal constant TX_SAVER_EXECUTOR_ID = bytes4(keccak256("TxSaverExecutor"));
    uint256 constant EOA_OR_WALLET_FEE_FLAG = 2; // see TxSaverBytesTransientStorage

    /// For TxSaver, total gas cost fee taken from user can't be higher than maxTxCost set by user
    error TxCostInFeeTokenTooHighError(uint256 maxTxCost, uint256 txCost);

    error FeeTokenNotSameAsSrcToken(address srcToken, address feeToken);

    function _sellWithTxSaverChoice(ExchangeData memory _exData, address _user, DFSRegistry _registry) 
        internal returns (
            address wrapperAddress,
            uint256 destAmount,
            bool hasFee,
            bool txSaverFeeTaken
        ) 
    {   
        address txSaverAddr = _registry.getAddr(TX_SAVER_EXECUTOR_ID);
        ITxSaverBytesTransientStorage tStorage = ITxSaverBytesTransientStorage(txSaverAddr);

        // Check if TxSaverExecutor initiated transaction by setting right flag in transient storage
        // we can't just check for msg.sender, as that wouldn't work for flashloan actions
        uint256 feeType = tStorage.getFeeType();
        
        // if not initiated by TxSaverExecutor, perform regular sell
        if (feeType == 0) {
            txSaverFeeTaken = false;
            (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
            return (wrapperAddress, destAmount, hasFee, txSaverFeeTaken);
        }

        (
            uint256 estimatedGas,
            uint256 l1GasCostInEth,
            TxSaverSignedData memory txSaverData,
            InjectedExchangeData memory injectedExchangeData
        ) = _readDataFromTransientStorage(feeType, tStorage);

        uint256 amountWithoutFee = _exData.srcAmount;

        _injectExchangeData(_exData, injectedExchangeData);

        // when taking fee from EOA/wallet perform regular sell
        // fee is taken inside the RecipeExecutor
        if (feeType == EOA_OR_WALLET_FEE_FLAG) {
            txSaverFeeTaken = false;
            (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
            return (wrapperAddress, destAmount, hasFee, txSaverFeeTaken);
        }
        
        // when taking fee from position, take tx cost before regular sell
        _takeTxSaverFee(_exData, txSaverData, estimatedGas, l1GasCostInEth);
        txSaverFeeTaken = true;
    
        // perform regular sell
        (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
    
        // revert back exData changes to keep it consistent
        _exData.srcAmount = amountWithoutFee;
    }

    function _injectExchangeData(ExchangeData memory _exData, InjectedExchangeData memory _injectedExchangeData) internal pure {
        // if offchain order data is present, inject it here
        if (_injectedExchangeData.offchainData.price > 0) {
            _exData.offchainData = _injectedExchangeData.offchainData;
        }

        // if onchain order data is present, inject it here 
        if (_injectedExchangeData.wrapper != address(0)) {
            _exData.wrapper = _injectedExchangeData.wrapper;
            _exData.wrapperData = _injectedExchangeData.wrapperData;
        }
    }

    function _readDataFromTransientStorage(uint256 _feeType, ITxSaverBytesTransientStorage _tStorage) 
        internal view returns (
            uint256 estimatedGas,
            uint256 l1GasCostInEth,
            TxSaverSignedData memory txSaverData,
            InjectedExchangeData memory injectedExchangeData
        ) 
    {
        if (_feeType == EOA_OR_WALLET_FEE_FLAG) {
            (estimatedGas, l1GasCostInEth, injectedExchangeData) = abi.decode(
                _tStorage.getBytesTransiently(),
                (uint256, uint256, InjectedExchangeData)
            );
        } else {
            (estimatedGas, l1GasCostInEth, txSaverData, injectedExchangeData) = abi.decode(
                _tStorage.getBytesTransiently(),
                (uint256, uint256, TxSaverSignedData, InjectedExchangeData)
            );
        }
    }

    function _takeTxSaverFee(
        ExchangeData memory _exData,
        TxSaverSignedData memory _txSaverData,
        uint256 _estimatedGas,
        uint256 _l1GasCostInEth
    ) internal {
        // when sending sponsored tx, no tx cost is taken
        if (_estimatedGas == 0) return;

        // calculate gas cost in src token
        uint256 txCostInSrcToken = calcGasCostUsingInjectedPrice(
            _estimatedGas,
            _exData.srcAddr,
            _txSaverData.tokenPriceInEth,
            _l1GasCostInEth
        );

        // revert if tx cost is higher than max value set by user
        if (txCostInSrcToken > _txSaverData.maxTxCostInFeeToken) {
            revert TxCostInFeeTokenTooHighError(_txSaverData.maxTxCostInFeeToken, txCostInSrcToken);
        }
        if (_exData.srcAddr != _txSaverData.feeToken){
            revert FeeTokenNotSameAsSrcToken(_exData.srcAddr, _txSaverData.feeToken);
        }

        // subtract tx cost from src amount and send it to fee recipient
        _exData.srcAmount = sub(_exData.srcAmount, txCostInSrcToken);
        _exData.srcAddr.withdrawTokens(TX_SAVER_FEE_RECIPIENT, txCostInSrcToken);
    }
}
