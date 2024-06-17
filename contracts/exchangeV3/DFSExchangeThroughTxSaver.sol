// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DFSExchangeCore } from "./DFSExchangeCore.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { GasFeeHelper } from "../../contracts/actions/fee/helpers/GasFeeHelper.sol";
import { ITxSaverBytesTransientStorage } from "../interfaces/ITxSaverBytesTransientStorage.sol";
import { DFSRegistry } from "../core/DFSRegistry.sol";

contract DFSExchangeThroughTxSaver is DFSExchangeCore, GasFeeHelper
{   
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    bytes4 internal constant TX_SAVER_EXECUTOR_ID = bytes4(keccak256("TxSaverExecutor"));

    /// For TxSaver, total gas cost fee taken from user can't be higher than maxTxCost set by user
    error TxCostInFeeTokenTooHighError(uint256 maxTxCost, uint256 txCost);

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
        
        /// @dev Check if TxSaverExecutor initiated transaction by setting right flag in transient storage
        /// @dev we can't just check for msg.sender, as that wouldn't work for flashloan actions
        if (tStorage.isPositionFeeDataStored()) {
            uint256 amountWithoutFee = _exData.srcAmount;

            _takeTxSaverFee(_exData, tStorage);
            txSaverFeeTaken = true;
            
            // perform regular sell
            (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
            
            // revert back exData changes to keep it consistent
            _exData.srcAmount = amountWithoutFee;

        } else {
            txSaverFeeTaken = false;
            (wrapperAddress, destAmount, hasFee) = _sell(_exData, _user);
        }
    }

    function _takeTxSaverFee(ExchangeData memory _exData, ITxSaverBytesTransientStorage _tStorage) internal {
        (
            uint256 estimatedGas,
            TxSaverSignedData memory txSaverData,
            InjectedExchangeData memory injectedExchangeData
        ) = abi.decode(
            _tStorage.getBytesTransiently(),
            (uint256, TxSaverSignedData, InjectedExchangeData)
        );

        // if offchain order data is present, inject it here
        if (injectedExchangeData.offchainData.price > 0) {
            _exData.offchainData = injectedExchangeData.offchainData;
        }

        // if onchain order data is present, inject it here 
        if (injectedExchangeData.wrapper != address(0)) {
            _exData.wrapper = injectedExchangeData.wrapper;
            _exData.wrapperData = injectedExchangeData.wrapperData;
        }

        // when sending sponsored tx, no tx cost is taken
        if (estimatedGas == 0) return;

        // calculate gas cost in src token
        uint256 txCostInSrcToken = calcGasCostUsingInjectedPrice(
            estimatedGas,
            _exData.srcAddr,
            txSaverData.tokenPriceInEth
        );

        // revert if tx cost is higher than max value set by user
        if (txCostInSrcToken > txSaverData.maxTxCostInFeeToken) {
            revert TxCostInFeeTokenTooHighError(txSaverData.maxTxCostInFeeToken, txCostInSrcToken);
        }

        // subtract tx cost from src amount and send it to fee recipient
        _exData.srcAmount = sub(_exData.srcAmount, txCostInSrcToken);
        _exData.srcAddr.withdrawTokens(feeRecipient.getFeeAddr(), txCostInSrcToken);
    }
}
