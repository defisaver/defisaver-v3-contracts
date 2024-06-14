// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;


import { DFSExchangeCore } from "./DFSExchangeCore.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { GasFeeHelper } from "../../contracts/actions/fee/helpers/GasFeeHelper.sol";
import { ITxRelayBytesTransientStorage } from "../interfaces/ITxRelayBytesTransientStorage.sol";

//TODO[TX-RELAY]: remove after testing
import { console } from "hardhat/console.sol";

contract DFSExchangeThroughTxRelay is DFSExchangeCore, GasFeeHelper
{   
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// For tx relay, total gas cost fee taken from user can't be higher than maxTxCost set by user
    error TxCostInFeeTokenTooHighError(uint256 maxTxCost, uint256 txCost);

    function _sellThroughTxRelay(ExchangeData memory exData, ITxRelayBytesTransientStorage tStorage) internal returns (address, uint256) {
        console.log("****************************Sell through tx relay");

        uint256 amountWithoutFee = exData.srcAmount;
        uint256 destBalanceBefore = exData.destAddr.getBalance(address(this));

        _takeDfsExchangeFee(exData, address(this));

        (
            uint256 estimatedGas,
            TxRelaySignedData memory txRelayData,
            InjectedExchangeData memory injectedExchangeData
        ) = abi.decode(
            tStorage.getBytesTransiently(),
            (uint256, TxRelaySignedData, InjectedExchangeData)
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

        console.log("****************************OffchainData*********************");
        console.log("**************************Estimated gas: %s", estimatedGas);
        console.log("**************************Tx gas price: %s", tx.gasprice);
        console.log("***************************ExchangeData*********************");
        console.log("**************************SrcAddr %s", exData.srcAddr);
        console.log("**************************DestAddr %s", exData.destAddr);
        console.log("**************************SrcAmount %s", exData.srcAmount);
        console.log("**************************DestAmount %s", exData.destAmount);
        console.log("**************************MinPrice %s", exData.minPrice);
        console.log("**************************DfsFeeDivider %s", exData.dfsFeeDivider);
        console.log("**************************User %s", exData.user);
        console.log("**************************Wrapper %s", exData.wrapper);

        uint256 txCostInSrcToken = calcGasCostUsingInjectedPrice(
            estimatedGas,
            exData.srcAddr,
            txRelayData.tokenPriceInEth
        );

        console.log("**************************Tx cost in src token: %s", txCostInSrcToken);
        console.log("**************************Max tx cost in fee token: %s", txRelayData.maxTxCostInFeeToken);
        if (txCostInSrcToken > txRelayData.maxTxCostInFeeToken) {
            revert TxCostInFeeTokenTooHighError(txRelayData.maxTxCostInFeeToken, txCostInSrcToken);
        }
        exData.srcAmount = sub(exData.srcAmount, txCostInSrcToken);
        exData.srcAddr.withdrawTokens(feeRecipient.getFeeAddr(), txCostInSrcToken);

        address wrapperAddr = _executeSwap(exData);

        uint256 destBalanceAfter = exData.destAddr.getBalance(address(this));
        uint256 amountBought = destBalanceAfter - destBalanceBefore;

        console.log("**************************Amount bought: %s", amountBought);

        // check slippage
        if (amountBought < wmul(exData.minPrice, exData.srcAmount)){
            revert SlippageHitError(amountBought, wmul(exData.minPrice, exData.srcAmount));
        }

        // revert back exData changes to keep it consistent
        exData.srcAmount = amountWithoutFee;

        return (wrapperAddr, amountBought);
    }
}
