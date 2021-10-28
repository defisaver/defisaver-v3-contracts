// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../DS/DSMath.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/exchange/IExchangeV3.sol";
import "../utils/ZrxAllowlist.sol";
import "./DFSExchangeData.sol";
import "../utils/Discount.sol";
import "../utils/FeeRecipient.sol";
import "./DFSExchangeHelper.sol";
import "./SaverExchangeRegistry.sol";
import "../interfaces/exchange/IOffchainWrapper.sol";
import "./helpers/ExchangeHelper.sol";

contract DFSExchangeCore is DFSExchangeHelper, DSMath, DFSExchangeData, ExchangeHelper {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    string public constant ERR_SLIPPAGE_HIT = "Slippage hit";
    string public constant ERR_DEST_AMOUNT_MISSING = "Dest amount missing";
    string public constant ERR_WRAPPER_INVALID = "Wrapper invalid";
    string public constant ERR_NOT_ZEROX_EXCHANGE = "Zerox exchange invalid";
    FeeRecipient public constant feeRecipient =
        FeeRecipient(FEE_RECIPIENT_ADDRESS);

    /// @notice Internal method that preforms a sell on 0x/on-chain
    /// @dev Useful for other DFS contract to integrate for exchanging
    /// @param exData Exchange data struct
    /// @return (address, uint) Address of the wrapper used and destAmount
    function _sell(ExchangeData memory exData) internal returns (address, uint256) {
        uint256 amountWithoutFee = exData.srcAmount;
        address wrapper = exData.offchainData.wrapper;
        bool offChainSwapSuccess;

        uint256 destBalanceBefore = exData.destAddr.getBalance(address(this));

        // Takes DFS exchange fee
        exData.srcAmount = exData.srcAmount - getFee(
            exData.srcAmount,
            exData.user,
            exData.srcAddr,
            exData.dfsFeeDivider
        );

        // Try 0x first and then fallback on specific wrapper
        if (exData.offchainData.price > 0) {
            (offChainSwapSuccess, ) = offChainSwap(exData, ExchangeActionType.SELL);
        }

        // fallback to desired wrapper if 0x failed
        if (!offChainSwapSuccess) {
            onChainSwap(exData, ExchangeActionType.SELL);
            wrapper = exData.wrapper;
        }

        uint256 destBalanceAfter = exData.destAddr.getBalance(address(this));
        uint256 amountBought = destBalanceAfter - destBalanceBefore;

        // check slippage
        if (amountBought < wmul(exData.minPrice, exData.srcAmount)){
            revert SlippageHitError(amountBought, wmul(exData.minPrice, exData.srcAmount));
        }

        // revert back exData changes to keep it consistent
        exData.srcAmount = amountWithoutFee;

        return (wrapper, amountBought);
    }

    /// @notice Internal method that preforms a buy on 0x/on-chain
    /// @dev Useful for other DFS contract to integrate for exchanging
    /// @param exData Exchange data struct
    /// @return (address, uint) Address of the wrapper used and srcAmount
    function _buy(ExchangeData memory exData) internal returns (address, uint256) {
        if (exData.destAmount == 0){
            revert DestAmountMissingError();
        }

        uint256 amountWithoutFee = exData.srcAmount;
        address wrapper = exData.offchainData.wrapper;
        bool offChainSwapSuccess;

        uint256 destBalanceBefore = exData.destAddr.getBalance(address(this));

        // Takes DFS exchange fee
        exData.srcAmount = exData.srcAmount - getFee(
            exData.srcAmount,
            exData.user,
            exData.srcAddr,
            exData.dfsFeeDivider
        );

        // Try 0x first and then fallback on specific wrapper
        if (exData.offchainData.price > 0) {
            (offChainSwapSuccess, ) = offChainSwap(exData, ExchangeActionType.BUY);
        }

        // fallback to desired wrapper if 0x failed
        if (!offChainSwapSuccess) {
            onChainSwap(exData, ExchangeActionType.BUY);
            wrapper = exData.wrapper;
        }

        uint256 destBalanceAfter = exData.destAddr.getBalance(address(this));
        uint256 amountBought = destBalanceAfter - destBalanceBefore;

        // check slippage
        if (amountBought < exData.destAmount){
            revert SlippageHitError(amountBought, exData.destAmount);
        }

        // revert back exData changes to keep it consistent
        exData.srcAmount = amountWithoutFee;

        return (wrapper, amountBought);
    }

    /// @notice Takes order from 0x and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function offChainSwap(ExchangeData memory _exData, ExchangeActionType _type)
        private
        returns (bool success, uint256)
    {
        if (!ZrxAllowlist(ZRX_ALLOWLIST_ADDR).isZrxAddr(_exData.offchainData.exchangeAddr)) {
            return (false, 0);
        }

        if (
            !SaverExchangeRegistry(SAVER_EXCHANGE_REGISTRY).isWrapper(_exData.offchainData.wrapper)
        ) {
            return (false, 0);
        }

        // send src amount
        IERC20(_exData.srcAddr).safeTransfer(_exData.offchainData.wrapper, _exData.srcAmount);

        return
            IOffchainWrapper(_exData.offchainData.wrapper).takeOrder{
                value: _exData.offchainData.protocolFee
            }(_exData, _type);
    }

    /// @notice Calls wrapper contract for exchange to preform an on-chain swap
    /// @param _exData Exchange data struct
    /// @param _type Type of action SELL|BUY
    /// @return swappedTokens For Sell that the destAmount, for Buy thats the srcAmount
    function onChainSwap(ExchangeData memory _exData, ExchangeActionType _type)
        internal
        returns (uint256 swappedTokens)
    {
        if (!(SaverExchangeRegistry(SAVER_EXCHANGE_REGISTRY).isWrapper(_exData.wrapper))){
            revert InvalidWrapperError();
        }

        IERC20(_exData.srcAddr).safeTransfer(_exData.wrapper, _exData.srcAmount);

        if (_type == ExchangeActionType.SELL) {
            swappedTokens = IExchangeV3(_exData.wrapper).sell(
                _exData.srcAddr,
                _exData.destAddr,
                _exData.srcAmount,
                _exData.wrapperData
            );
        } else {
            swappedTokens = IExchangeV3(_exData.wrapper).buy(
                _exData.srcAddr,
                _exData.destAddr,
                _exData.destAmount,
                _exData.wrapperData
            );
        }
    }

    /// @notice Takes a feePercentage and sends it to wallet
    /// @param _amount Dai amount of the whole trade
    /// @param _user Address of the user
    /// @param _token Address of the token
    /// @param _dfsFeeDivider Dfs fee divider
    /// @return feeAmount Amount in Dai owner earned on the fee
    function getFee(
        uint256 _amount,
        address _user,
        address _token,
        uint256 _dfsFeeDivider
    ) internal returns (uint256 feeAmount) {
        if (_dfsFeeDivider != 0 && Discount(DISCOUNT_ADDRESS).isCustomFeeSet(_user)) {
            _dfsFeeDivider = Discount(DISCOUNT_ADDRESS).getCustomServiceFee(_user);
        }

        if (_dfsFeeDivider == 0) {
            feeAmount = 0;
        } else {
            feeAmount = _amount / _dfsFeeDivider;

            // fee can't go over 10% of the whole amount
            if (feeAmount > (_amount / 10)) {
                feeAmount = _amount / 10;
            }

            address walletAddr = feeRecipient.getFeeAddr();

            _token.withdrawTokens(walletAddr, feeAmount);
        }
    }

}
