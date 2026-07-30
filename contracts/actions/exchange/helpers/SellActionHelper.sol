// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";

/// @title Common helpers for sell actions
/// @notice Keeps shared ETH/WETH handling and sell bookkeeping in one place.
library SellActionHelper {
    using TokenUtils for address;

    /// @notice '_from' and '_to' addresses must be the same for same tokens sell
    error SameAssetsSell_InvalidFromToAddress();
    /// @notice Source amount must be available for same tokens sell
    error SameAssetsSell_InsufficientBalance();

    /// @notice Handle max amount for sell
    function setMaxAmountIfNeeded(DFSExchangeData.ExchangeData memory _exchangeData, address _from)
        internal
        view
    {
        // For ETH, use smart wallet balance as it will be sent from EOA to wallet during the call.
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr
                .getBalance(_exchangeData.srcAddr == TokenUtils.ETH_ADDR ? address(this) : _from);
        }
    }

    /// @notice Try to handle direct token conversions:
    /// - Same assets sell (no fees, no pulling, no sending)
    /// - ETH -> WETH conversion (wrap operation, no fees)
    /// - WETH -> ETH conversion (unwrap operation, no fees)
    function tryHandleDirectTokenConversion(
        DFSExchangeData.ExchangeData memory _exchangeData,
        address _from,
        address _to
    ) internal returns (bool handled, uint256 exchangedAmount, bytes memory logData) {
        // If source and destination address are same we want to skip exchanging and take no fees.
        if (_exchangeData.srcAddr == _exchangeData.destAddr) {
            // Sanity check: sell action should not act as a plain token transfer here
            if (_from != _to) {
                revert SameAssetsSell_InvalidFromToAddress();
            }

            // Sanity check: the source amount must be available on the '_from' address,
            // so later actions can trust that the `exchangedAmount` of tokens exists.
            if (_exchangeData.srcAddr.getBalance(_from) < _exchangeData.srcAmount) {
                revert SameAssetsSell_InsufficientBalance();
            }

            exchangedAmount = _exchangeData.srcAmount;
            _exchangeData.dfsFeeDivider = 0;
            logData = encodeSellLogData(_exchangeData, address(0), exchangedAmount);
            return (true, exchangedAmount, logData);
        }

        // For ETH -> WETH conversion, perform wrap operation and take no fees.
        if (
            _exchangeData.srcAddr == TokenUtils.ETH_ADDR
                && _exchangeData.destAddr == TokenUtils.WETH_ADDR
        ) {
            TokenUtils.depositWeth(_exchangeData.srcAmount);
            _exchangeData.destAddr.withdrawTokens(_to, _exchangeData.srcAmount);

            exchangedAmount = _exchangeData.srcAmount;
            _exchangeData.dfsFeeDivider = 0;
            logData = encodeSellLogData(_exchangeData, address(0), exchangedAmount);
            return (true, exchangedAmount, logData);
        }

        // For WETH -> ETH conversion, perform unwrap operation and take no fees.
        if (
            _exchangeData.srcAddr == TokenUtils.WETH_ADDR
                && _exchangeData.destAddr == TokenUtils.ETH_ADDR
        ) {
            _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);
            TokenUtils.withdrawWeth(_exchangeData.srcAmount);
            _exchangeData.destAddr.withdrawTokens(_to, _exchangeData.srcAmount);

            exchangedAmount = _exchangeData.srcAmount;
            _exchangeData.dfsFeeDivider = 0;
            logData = encodeSellLogData(_exchangeData, address(0), exchangedAmount);
            return (true, exchangedAmount, logData);
        }
    }

    /// @notice Pull tokens for sell
    /// @dev Handles ETH -> WETH conversion
    function pullTokens(DFSExchangeData.ExchangeData memory _exchangeData, address _from)
        internal
        returns (bool isEthDest)
    {
        // Wrap ETH if sent directly.
        if (_exchangeData.srcAddr == TokenUtils.ETH_ADDR) {
            TokenUtils.depositWeth(_exchangeData.srcAmount);
            _exchangeData.srcAddr = TokenUtils.WETH_ADDR;
        } else {
            _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);
        }

        // We always swap with WETH, convert token addr when ETH sent for unwrapping later.
        if (_exchangeData.destAddr == TokenUtils.ETH_ADDR) {
            _exchangeData.destAddr = TokenUtils.WETH_ADDR;
            isEthDest = true;
        }
    }

    /// @notice Send tokens after sell
    /// @dev Handles WETH -> ETH conversion
    function sendTokensAfterSell(
        DFSExchangeData.ExchangeData memory _exchangeData,
        address _to,
        uint256 _exchangedAmount,
        bool _isEthDest
    ) internal {
        // If the destination token is WETH, withdraw it and convert to ETH.
        if (_isEthDest) {
            TokenUtils.withdrawWeth(_exchangedAmount);
            _exchangeData.destAddr = TokenUtils.ETH_ADDR;
        }

        // Send the tokens to the recipient. Also handles raw ETH sending.
        _exchangeData.destAddr.withdrawTokens(_to, _exchangedAmount);
    }

    /// @notice Encode sell log data
    function encodeSellLogData(
        DFSExchangeData.ExchangeData memory _exchangeData,
        address _wrapper,
        uint256 _exchangedAmount
    ) internal pure returns (bytes memory) {
        return abi.encode(
            _wrapper,
            _exchangeData.srcAddr,
            _exchangeData.destAddr,
            _exchangeData.srcAmount,
            _exchangedAmount,
            _exchangeData.dfsFeeDivider
        );
    }
}
