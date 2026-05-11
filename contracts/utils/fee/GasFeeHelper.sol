// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { FeeRecipient } from "../../utils/fee/FeeRecipient.sol";
import { TokenPriceHelper } from "../../utils/token/TokenPriceHelper.sol";
import { GasCostLib } from "./GasCostLib.sol";
import { DFSFeeLib } from "../../utils/fee/DFSFeeLib.sol";

/// @title GasFeeHelper
/// @notice Helper contract for calculating the gas cost for strategies
/// @dev For non-WETH tokens, the price is fetched on-chain, so we do not revert on a zero price.
/// @dev The worst-case outcome is that no fees are taken for that transaction.
contract GasFeeHelper is TokenPriceHelper {
    using TokenUtils for address;

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    function calcGasCost(uint256 _gasUsed, address _feeToken) public view returns (uint256 txCost) {
        bool isNativeToken = _feeToken == TokenUtils.WETH_ADDR || _feeToken == TokenUtils.ETH_ADDR;
        uint256 price = isNativeToken ? 0 : getPriceInETH(_feeToken);
        txCost = GasCostLib.calcGasCost(_gasUsed, _feeToken, price, 0, false);
    }

    function takeGasFee(uint256 _gasUsed, address _feeToken, uint256 _availableAmount)
        internal
        returns (uint256 feeTaken)
    {
        feeTaken = calcGasCost(_gasUsed, _feeToken);
        feeTaken = GasCostLib.capGasFeeAt20Percent(feeTaken, _availableAmount);

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), feeTaken);
    }

    function takeGasAndAutomationFee(
        uint256 _gasUsed,
        address _feeToken,
        uint256 _availableAmount,
        uint256 _dfsFeeDivider
    ) internal returns (uint256 feeTaken) {
        feeTaken = calcGasCost(_gasUsed, _feeToken);
        feeTaken = GasCostLib.capGasFeeAt20Percent(feeTaken, _availableAmount);
        feeTaken += DFSFeeLib.calculateAutomationFee(_dfsFeeDivider, _availableAmount);

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), feeTaken);
    }
}
