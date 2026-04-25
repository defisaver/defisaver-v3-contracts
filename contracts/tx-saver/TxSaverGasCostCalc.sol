// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { DSMath } from "../_vendor/DS/DSMath.sol";
import { UtilAddresses } from "../utils/addresses/UtilAddresses.sol";

contract TxSaverGasCostCalc is DSMath, UtilAddresses {
    using TokenUtils for address;

    uint256 private constant SANITY_GAS_PRICE = 1000 gwei;

    // only support token with decimals <= 18
    error TokenDecimalsTooHigh(uint256 decimals);
    // when injecting price, price must be greater than 0
    error ZeroTokenPriceInEthError();

    function calcGasCostUsingInjectedPrice(
        uint256 _gasUsed,
        address _feeToken,
        uint256 _tokenPriceInEth,
        uint256 _l1GasCostInEth
    ) internal view returns (uint256 txCost) {
        uint256 gasPrice = tx.gasprice;

        // gas price must be in a reasonable range
        if (tx.gasprice > SANITY_GAS_PRICE) {
            gasPrice = SANITY_GAS_PRICE;
        }

        // can't use more gas than the block gas limit
        if (_gasUsed > block.gaslimit) {
            _gasUsed = block.gaslimit;
        }

        // additional l1 gas cost must stay 0 for mainnet
        if (block.chainid == 1 && _l1GasCostInEth > 0) {
            _l1GasCostInEth = 0;
        }

        // calc gas used
        txCost = (_gasUsed * gasPrice) + _l1GasCostInEth;

        // convert to token amount
        if (_feeToken != TokenUtils.WETH_ADDR) {
            uint256 tokenDecimals = _feeToken.getTokenDecimals();

            if (tokenDecimals > 18) revert TokenDecimalsTooHigh(tokenDecimals);

            if (_tokenPriceInEth == 0) revert ZeroTokenPriceInEthError();

            txCost = wdiv(txCost, _tokenPriceInEth) / (10 ** (18 - tokenDecimals));
        }
    }
}
