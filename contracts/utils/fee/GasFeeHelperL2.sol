// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { FeeRecipient } from "../../utils/fee/FeeRecipient.sol";
import { TokenPriceHelperL2 } from "../../utils/token/TokenPriceHelperL2.sol";
import { GasCostLib } from "./GasCostLib.sol";
import { DFSFeeLib } from "../../utils/fee/DFSFeeLib.sol";

/// @title GasFeeHelperL2
/// @notice Helper contract for calculating the gas cost for strategies on L2
/// @dev For non-WETH tokens, the price is fetched on-chain, so we do not revert on a zero price.
/// @dev The worst-case outcome is that no fees are taken for that transaction.
contract GasFeeHelperL2 is TokenPriceHelperL2 {
    using TokenUtils for address;

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    function calcGasCost(uint256 _gasUsed, address _feeToken, uint256 _l1GasCostInEth)
        public
        view
        returns (uint256 txCost)
    {
        uint256 price = _feeToken == TokenUtils.WETH_ADDR ? 0 : getPriceInETH(_feeToken);
        txCost = GasCostLib.calcGasCost(_gasUsed, _feeToken, price, _l1GasCostInEth, false);
    }

    function takeGasFee(
        uint256 _gasUsed,
        address _feeToken,
        uint256 _availableAmount,
        uint256 _l1GasCostInEth
    ) internal returns (uint256 feeTaken) {
        feeTaken = calcGasCost(_gasUsed, _feeToken, _l1GasCostInEth);
        feeTaken = GasCostLib.capGasFeeAt20Percent(feeTaken, _availableAmount);

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), feeTaken);
    }

    function takeGasAndAutomationFee(
        uint256 _gasUsed,
        address _feeToken,
        uint256 _availableAmount,
        uint256 _dfsFeeDivider,
        uint256 _l1GasCostInEth
    ) internal returns (uint256 feeTaken) {
        feeTaken = calcGasCost(_gasUsed, _feeToken, _l1GasCostInEth);
        feeTaken = GasCostLib.capGasFeeAt20Percent(feeTaken, _availableAmount);
        feeTaken += DFSFeeLib.calculateAutomationFee(_dfsFeeDivider, _availableAmount);

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), feeTaken);
    }
}
