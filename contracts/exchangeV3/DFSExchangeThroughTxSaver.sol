// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DFSExchangeCore } from "./DFSExchangeCore.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { GasFeeHelper } from "../../contracts/actions/fee/helpers/GasFeeHelper.sol";
import { ITxSaverBytesTransientStorage } from "../interfaces/ITxSaverBytesTransientStorage.sol";

contract DFSExchangeThroughTxSaver is DFSExchangeCore, GasFeeHelper
{   
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// For TxSaver, total gas cost fee taken from user can't be higher than maxTxCost set by user
    error TxCostInFeeTokenTooHighError(uint256 maxTxCost, uint256 txCost);

    function _sellThroughTxSaver(ExchangeData memory exData, ITxSaverBytesTransientStorage tStorage) 
        internal returns (address, uint256) 
    {
        uint256 amountWithoutFee = exData.srcAmount;
        uint256 destBalanceBefore = exData.destAddr.getBalance(address(this));

        _takeDfsExchangeFee(exData, address(this));

        _takeTxSaverFee(exData, tStorage);

        address wrapperAddr = _executeSwap(exData);

        uint256 destBalanceAfter = exData.destAddr.getBalance(address(this));
        uint256 amountBought = destBalanceAfter - destBalanceBefore;

        // check slippage
        if (amountBought < wmul(exData.minPrice, exData.srcAmount)){
            revert SlippageHitError(amountBought, wmul(exData.minPrice, exData.srcAmount));
        }

        // revert back exData changes to keep it consistent
        exData.srcAmount = amountWithoutFee;

        return (wrapperAddr, amountBought);
    }

    function _takeTxSaverFee(ExchangeData memory exData, ITxSaverBytesTransientStorage tStorage) internal {
        (
            uint256 estimatedGas,
            TxSaverSignedData memory txSaverData,
            InjectedExchangeData memory injectedExchangeData
        ) = abi.decode(
            tStorage.getBytesTransiently(),
            (uint256, TxSaverSignedData, InjectedExchangeData)
        );

        // if offchain order data is present, inject it here
        if (injectedExchangeData.offchainData.price > 0) {
            exData.offchainData = injectedExchangeData.offchainData;
        }

        // if onchain order data is present, inject it here 
        if (injectedExchangeData.wrapper != address(0)) {
            exData.wrapper = injectedExchangeData.wrapper;
            exData.wrapperData = injectedExchangeData.wrapperData;
        }

        // calculate gas cost in src token
        uint256 txCostInSrcToken = calcGasCostUsingInjectedPrice(
            estimatedGas,
            exData.srcAddr,
            txSaverData.tokenPriceInEth
        );

        // revert if tx cost is higher than max value set by user
        if (txCostInSrcToken > txSaverData.maxTxCostInFeeToken) {
            revert TxCostInFeeTokenTooHighError(txSaverData.maxTxCostInFeeToken, txCostInSrcToken);
        }

        // subtract tx cost from src amount and send it to fee recipient
        exData.srcAmount = sub(exData.srcAmount, txCostInSrcToken);
        exData.srcAddr.withdrawTokens(feeRecipient.getFeeAddr(), txCostInSrcToken);
    }
}
