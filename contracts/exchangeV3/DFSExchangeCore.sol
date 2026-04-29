// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/token/IERC20.sol";
import { IExchangeV3 } from "../interfaces/exchange/IExchangeV3.sol";
import {
    IExchangeAggregatorRegistry
} from "../interfaces/exchange/IExchangeAggregatorRegistry.sol";
import { IWrapperExchangeRegistry } from "../interfaces/exchange/IWrapperExchangeRegistry.sol";
import { IOffchainWrapper } from "../interfaces/exchange/IOffchainWrapper.sol";

import { DFSExchangeData } from "./DFSExchangeData.sol";
import { Discount } from "../utils/Discount.sol";
import { FeeRecipient } from "../utils/fee/FeeRecipient.sol";
import { ExchangeHelper } from "./helpers/ExchangeHelper.sol";
import { SafeERC20 } from "../_vendor/openzeppelin/SafeERC20.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { DSMath } from "../_vendor/DS/DSMath.sol";

/// @title DFSExchangeCore
/// @notice Contract containing the core logic for performing swaps used by other DFS Sell actions.
contract DFSExchangeCore is DSMath, DFSExchangeData, ExchangeHelper {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    error SlippageHitError(uint256 amountBought, uint256 amountExpected);
    error InvalidWrapperError(address wrapperAddress);

    // Used for verifying exchange addresses used in offchain swaps.
    IExchangeAggregatorRegistry internal constant exchangeAggRegistry =
        IExchangeAggregatorRegistry(EXCHANGE_AGGREGATOR_REGISTRY_ADDR);

    // Used for verifying wrapper addresses used in both offchain and onchain swaps.
    IWrapperExchangeRegistry internal constant wrapperRegistry =
        IWrapperExchangeRegistry(WRAPPER_EXCHANGE_REGISTRY_ADDR);

    /// @notice Internal method that performs a sell on offchain aggregator/on-chain
    /// @param _exData Exchange data struct
    /// @return wrapperAddress Address of the wrapper used
    /// @return destAmount Amount of tokens bought
    /// @dev Useful for other DFS contracts to integrate for exchanging
    function _sell(ExchangeData memory _exData)
        internal
        returns (address wrapperAddress, uint256 destAmount)
    {
        (wrapperAddress, destAmount,) = _sell(_exData, address(this));
    }

    /// @notice Internal method that performs a sell on offchain aggregator/on-chain
    /// @param _exData Exchange data struct
    /// @param _smartWallet Smart wallet address used to check if service fees are disabled.
    /// @return wrapperAddress Address of the wrapper used
    /// @return destAmount Amount of tokens bought
    /// @return hasFee Whether there was a fee taken
    /// @dev Useful for other DFS contracts to integrate for exchanging
    function _sell(ExchangeData memory _exData, address _smartWallet)
        internal
        returns (address wrapperAddress, uint256 destAmount, bool hasFee)
    {
        uint256 amountWithoutFee = _exData.srcAmount;
        uint256 destBalanceBefore = _exData.destAddr.getBalance(address(this));

        _takeDfsExchangeFee(_exData, _smartWallet);

        wrapperAddress = _executeSwap(_exData);

        uint256 destBalanceAfter = _exData.destAddr.getBalance(address(this));
        destAmount = destBalanceAfter - destBalanceBefore;

        // check slippage
        uint256 minExpectedDestAmount = wmul(_exData.minPrice, _exData.srcAmount);
        if (destAmount < minExpectedDestAmount) {
            revert SlippageHitError(destAmount, minExpectedDestAmount);
        }

        hasFee = _exData.srcAmount != amountWithoutFee;

        // revert back exData changes to keep it consistent
        _exData.srcAmount = amountWithoutFee;
    }

    /// @notice Executes the swap on the offchain aggregator with on-chain fallback.
    /// @param _exData Exchange data struct
    /// @return wrapperAddress Address of the wrapper used (offchain or onchain)
    function _executeSwap(ExchangeData memory _exData) internal returns (address wrapperAddress) {
        wrapperAddress = _exData.offchainData.wrapper;
        bool offChainSwapSuccess;

        // Try offchain aggregator first and then fallback to on-chain swap.
        if (_exData.offchainData.price > 0) {
            (offChainSwapSuccess,) = _offChainSwap(_exData);
        }

        // Fallback to on-chain swap if offchain aggregator failed.
        if (!offChainSwapSuccess) {
            wrapperAddress = _exData.wrapper;
            _onChainSwap(_exData);
        }
    }

    /// @notice Takes order from exchange aggregator and returns bool indicating if it is successful
    /// @param _exData Exchange data
    /// @return success Whether the swap was successful
    /// @return destAmount Amount of tokens bought
    function _offChainSwap(ExchangeData memory _exData)
        internal
        returns (bool success, uint256 destAmount)
    {
        /// @dev Only trust exchange addresses from exchange aggregator registry.
        if (!exchangeAggRegistry.isExchangeAggregatorAddr(_exData.offchainData.exchangeAddr)) {
            return (false, 0);
        }

        /// @dev Only trust wrapper addresses from wrapper registry.
        if (!wrapperRegistry.isWrapper(_exData.offchainData.wrapper)) {
            return (false, 0);
        }

        // Send source amount to wrapper.
        IERC20(_exData.srcAddr).safeTransfer(_exData.offchainData.wrapper, _exData.srcAmount);

        // Perform off-chain swap.
        (success, destAmount) = IOffchainWrapper(_exData.offchainData.wrapper).takeOrder(_exData);
    }

    /// @notice Calls wrapper contract for exchange to preform an on-chain swap
    /// @param _exData Exchange data struct
    /// @return destAmount Amount of tokens bought
    function _onChainSwap(ExchangeData memory _exData) internal returns (uint256 destAmount) {
        /// @dev Only trust wrapper addresses from wrapper registry.
        if (!wrapperRegistry.isWrapper(_exData.wrapper)) {
            revert InvalidWrapperError(_exData.wrapper);
        }

        // Send source amount to wrapper.
        IERC20(_exData.srcAddr).safeTransfer(_exData.wrapper, _exData.srcAmount);

        // Perform on-chain swap.
        destAmount = IExchangeV3(_exData.wrapper)
            .sell(_exData.srcAddr, _exData.destAddr, _exData.srcAmount, _exData.wrapperData);
    }

    /// @notice Takes the DFS exchange fee from the source amount.
    /// @param _exData Exchange data struct
    /// @param _smartWallet Smart wallet address used to check if service fees are disabled.
    function _takeDfsExchangeFee(ExchangeData memory _exData, address _smartWallet) internal {
        _exData.srcAmount -= _getFee(
            _exData.srcAmount, _smartWallet, _exData.srcAddr, _exData.dfsFeeDivider
        );
    }

    /// @notice Calculates and transfers the DFS fee for a given amount.
    /// @param _amount Total amount used to calculate the fee.
    /// @param _wallet User wallet used to check whether service fees are disabled.
    /// @param _token Token address for fee transfer
    /// @param _dfsFeeDivider Fee divider used to calculate the fee. A value of 0 disables the fee.
    /// @return feeAmount DFS fee amount transferred to fee recipient.
    function _getFee(uint256 _amount, address _wallet, address _token, uint256 _dfsFeeDivider)
        internal
        returns (uint256 feeAmount)
    {
        if (_dfsFeeDivider == 0) return 0;

        if (Discount(DISCOUNT_ADDRESS).serviceFeesDisabled(_wallet)) {
            return 0;
        }

        feeAmount = _amount / _dfsFeeDivider;
        address feeRecipient = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();
        _token.withdrawTokens(feeRecipient, feeAmount);
    }
}
