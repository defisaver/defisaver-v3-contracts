// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "./TokenUtils.sol";
import { DSMath } from "../DS/DSMath.sol";
import { UtilHelper } from "./helpers/UtilHelper.sol";

contract TxSaverGasCostCalc is DSMath, UtilHelper {
    using TokenUtils for address;
    
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
        // can't use more gas than the block gas limit
        if (_gasUsed > block.gaslimit) {
            _gasUsed = block.gaslimit;
        }

        // calc gas used
        txCost = (_gasUsed * tx.gasprice) + _l1GasCostInEth;    

        // convert to token amount
        if (_feeToken != TokenUtils.WETH_ADDR) {
            uint256 tokenDecimals = _feeToken.getTokenDecimals();

            if (tokenDecimals > 18) revert TokenDecimalsTooHigh(tokenDecimals);

            if (_tokenPriceInEth == 0) revert ZeroTokenPriceInEthError();

            txCost = wdiv(txCost, _tokenPriceInEth) / (10**(18 - tokenDecimals));
        }
    }
}