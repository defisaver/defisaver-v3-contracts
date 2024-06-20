// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../../../DS/DSMath.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { FeeRecipient } from "../../../utils/FeeRecipient.sol";
import { TokenPriceHelperL2 } from "../../../utils/TokenPriceHelperL2.sol";

contract GasFeeHelperL2 is DSMath, TokenPriceHelperL2 {
    using TokenUtils for address;

     // only support token with decimals <= 18
    error TokenDecimalsUnsupportedError(uint256 decimals);
    // when injecting price, price must be greater than 0
    error ZeroTokenPriceInEthError();

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    uint256 public constant SANITY_GAS_PRICE = 1000 gwei;

    /// @dev Divider for input amount, 5 bps
    uint256 public constant MAX_DFS_FEE = 2000;

    function calcGasCost(uint256 _gasUsed, address _feeToken, uint256 _l1GasCostInEth) public view returns (uint256 txCost) {
        uint256 gasPrice = tx.gasprice;

        // gas price must be in a reasonable range
        if (tx.gasprice > SANITY_GAS_PRICE) {
            gasPrice = SANITY_GAS_PRICE;
        }

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
                txCost = wdiv(txCost, uint256(price)) / (10**(18 - tokenDecimals));
            } else {
                txCost = 0;
            }
        }
    }

    function calcGasCostUsingInjectedPrice(
        uint256 _gasUsed,
        address _feeToken,
        uint256 _tokenPriceInEth
    ) internal view returns (uint256 txCost) {
        // can't use more gas than the block gas limit
        if (_gasUsed > block.gaslimit) {
            _gasUsed = block.gaslimit;
        }

        // calc gas used
        txCost = _gasUsed * tx.gasprice;    

        // convert to token amount
        if (_feeToken != TokenUtils.WETH_ADDR) {
            uint256 tokenDecimals = _feeToken.getTokenDecimals();

            if (tokenDecimals > 18) revert TokenDecimalsUnsupportedError(tokenDecimals);

            if (_tokenPriceInEth == 0) revert ZeroTokenPriceInEthError();

            txCost = wdiv(txCost, _tokenPriceInEth) / (10**(18 - tokenDecimals));
        }
    }
}