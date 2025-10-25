// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { FeeRecipient } from "../../../utils/fee/FeeRecipient.sol";
import { TokenPriceHelperL2 } from "../../../utils/token/TokenPriceHelperL2.sol";

contract GasFeeHelperL2 is DSMath, TokenPriceHelperL2 {
    using TokenUtils for address;

    // only support token with decimals <= 18
    error TokenDecimalsUnsupportedError(uint256 decimals);

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    uint256 public constant SANITY_GAS_PRICE = 1000 gwei;

    /// @dev Divider for input amount, 5 bps
    uint256 public constant MAX_DFS_FEE = 2000;

    function calcGasCost(uint256 _gasUsed, address _feeToken, uint256 _l1GasCostInEth)
        public
        view
        returns (uint256 txCost)
    {
        uint256 gasPrice = tx.gasprice;

        // gas price must be in a reasonable range
        if (tx.gasprice > SANITY_GAS_PRICE) {
            gasPrice = SANITY_GAS_PRICE;
        }

        /// @dev we acknowledge that Arbitrum block gas limit can be higher than others
        // can't use more gas than the block gas limit
        if (_gasUsed > block.gaslimit) {
            _gasUsed = block.gaslimit;
        }

        // calc gas used
        txCost = (_gasUsed * gasPrice) + _l1GasCostInEth;

        // convert to token amount
        if (_feeToken != TokenUtils.WETH_ADDR) {
            uint256 price = getPriceInETH(_feeToken);
            uint256 tokenDecimals = _feeToken.getTokenDecimals();

            if (tokenDecimals > 18) revert TokenDecimalsUnsupportedError(tokenDecimals);

            if (price > 0) {
                txCost = wdiv(txCost, uint256(price)) / (10 ** (18 - tokenDecimals));
            } else {
                txCost = 0;
            }
        }
    }
}
