// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../interfaces/exchange/IExchangeV3.sol";
import { DFSExchangeData } from "./DFSExchangeData.sol";
import { Discount } from "../utils/Discount.sol";
import { FeeRecipient } from "../utils/FeeRecipient.sol";
import { DFSExchangeHelper } from "./DFSExchangeHelper.sol";
import { ExchangeAggregatorRegistry } from "./registries/ExchangeAggregatorRegistry.sol";
import { WrapperExchangeRegistry } from "./registries/WrapperExchangeRegistry.sol";
import { IOffchainWrapper } from "../interfaces/exchange/IOffchainWrapper.sol";
import { ExchangeHelper } from "./helpers/ExchangeHelper.sol";
import { StrategyModel } from "../core/strategy/StrategyModel.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { DSMath } from "../DS/DSMath.sol";

contract DFSExchangeCore is
    DSMath,
    DFSExchangeHelper,
    DFSExchangeData,
    ExchangeHelper,
    StrategyModel
{   
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    error SlippageHitError(uint256 amountBought, uint256 amountExpected);
    error InvalidWrapperError(address wrapperAddr);

    ExchangeAggregatorRegistry internal constant exchangeAggRegistry = ExchangeAggregatorRegistry(EXCHANGE_AGGREGATOR_REGISTRY_ADDR);
    WrapperExchangeRegistry internal constant wrapperRegistry = WrapperExchangeRegistry(WRAPPER_EXCHANGE_REGISTRY);

    /// @notice Internal method that performs a sell on offchain aggregator/on-chain
    /// @dev Useful for other DFS contract to integrate for exchanging
    /// @param exData Exchange data struct
    function _sell(ExchangeData memory exData) internal returns (address wrapperAddress, uint256 destAmount) {
        (wrapperAddress, destAmount, ) = _sell(exData, address(this));
    }

    /// @notice Internal method that performs a sell on offchain aggregator/on-chain
    /// @dev Useful for other DFS contract to integrate for exchanging
    /// @param exData Exchange data struct
    /// @return (address, uint, bool) Address of the wrapper used and destAmount and if there was fee
    function _sell(ExchangeData memory exData, address smartWallet) internal returns (address, uint256, bool) {
        uint256 amountWithoutFee = exData.srcAmount;
        uint256 destBalanceBefore = exData.destAddr.getBalance(address(this));

        _takeDfsExchangeFee(exData, smartWallet);

        address wrapperAddr = _executeSwap(exData);

        uint256 destBalanceAfter = exData.destAddr.getBalance(address(this));
        uint256 amountBought = destBalanceAfter - destBalanceBefore;

        // check slippage
        if (amountBought < wmul(exData.minPrice, exData.srcAmount)){
            revert SlippageHitError(amountBought, wmul(exData.minPrice, exData.srcAmount));
        }

        bool hasFee = exData.srcAmount != amountWithoutFee;
        // revert back exData changes to keep it consistent
        exData.srcAmount = amountWithoutFee;

        return (wrapperAddr, amountBought, hasFee);
    }

    /// @notice Takes order from exchange aggregator and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function offChainSwap(ExchangeData memory _exData)
        internal
        returns (bool success, uint256)
    {
        /// @dev Check if exchange address is in our registry to not call an untrusted contract
        if (!exchangeAggRegistry.isExchangeAggregatorAddr(_exData.offchainData.exchangeAddr)) {
            return (false, 0);
        }

        /// @dev Check if we have the address is a registered wrapper
        if (!wrapperRegistry.isWrapper(_exData.offchainData.wrapper)) {
            return (false, 0);
        }

        // send src amount
        IERC20(_exData.srcAddr).safeTransfer(_exData.offchainData.wrapper, _exData.srcAmount);

        return IOffchainWrapper(_exData.offchainData.wrapper).takeOrder(_exData);
    }

    /// @notice Calls wrapper contract for exchange to preform an on-chain swap
    /// @param _exData Exchange data struct
    /// @return swappedTokens Dest amount of tokens we get after sell
    function onChainSwap(ExchangeData memory _exData)
        internal
        returns (uint256 swappedTokens)
    {
        if (!(WrapperExchangeRegistry(WRAPPER_EXCHANGE_REGISTRY).isWrapper(_exData.wrapper))){
            revert InvalidWrapperError(_exData.wrapper);
        }

        IERC20(_exData.srcAddr).safeTransfer(_exData.wrapper, _exData.srcAmount);

        swappedTokens = IExchangeV3(_exData.wrapper).sell(
            _exData.srcAddr,
            _exData.destAddr,
            _exData.srcAmount,
            _exData.wrapperData
        );
    }

    function _takeDfsExchangeFee(ExchangeData memory exData, address smartWallet) internal {
        if (exData.dfsFeeDivider != 0) {
            exData.srcAmount = sub(exData.srcAmount, getFee(
                exData.srcAmount,
                smartWallet,
                exData.srcAddr,
                exData.dfsFeeDivider
            ));
        }
    }

    function _executeSwap(ExchangeData memory exData) internal returns (address wrapperAddr) {
        wrapperAddr = exData.offchainData.wrapper;
        bool offChainSwapSuccess;

         // Try offchain aggregator first and then fallback on specific wrapper
        if (exData.offchainData.price > 0) {
            (offChainSwapSuccess, ) = offChainSwap(exData);
        }

        // fallback to desired wrapper if offchain aggregator failed
        if (!offChainSwapSuccess) {
            onChainSwap(exData);
            wrapperAddr = exData.wrapper;
        }
    }

    /// @notice Takes a feePercentage and sends it to wallet
    /// @param _amount Amount of the whole trade
    /// @param _wallet Address of the users wallet (safe or dsproxy)
    /// @param _token Address of the token
    /// @param _dfsFeeDivider Dfs fee divider
    /// @return feeAmount Amount owner earned on the fee
    function getFee(
        uint256 _amount,
        address _wallet,
        address _token,
        uint256 _dfsFeeDivider
    ) internal returns (uint256 feeAmount) {
        if (_dfsFeeDivider != 0 && Discount(DISCOUNT_ADDRESS).serviceFeesDisabled(_wallet)) {
            _dfsFeeDivider = 0;
        }

        if (_dfsFeeDivider == 0) {
            feeAmount = 0;
        } else {
            feeAmount = _amount / _dfsFeeDivider;
            address walletAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();
            _token.withdrawTokens(walletAddr, feeAmount);
        }
    }
}
