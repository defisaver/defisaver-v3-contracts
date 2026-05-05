// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/token/TokenUtils.sol";

library GasCostLib {
    using TokenUtils for address;

    uint256 internal constant SANITY_GAS_PRICE = 1000 gwei;
    uint256 internal constant WAD = 10 ** 18;
    uint256 internal constant MAX_GAS_FEE_DIVIDER = 5;

    error TokenDecimalsUnsupportedError(uint256 decimals);
    error ZeroTokenPriceInEthError();

    function calcGasCost(
        uint256 _gasUsed,
        address _feeToken,
        uint256 _tokenPriceInEth,
        uint256 _l1GasCostInEth,
        bool _revertOnZeroPrice
    ) internal view returns (uint256 txCost) {
        txCost = calcGasCostInEth(_gasUsed, _l1GasCostInEth);

        if (_feeToken != TokenUtils.WETH_ADDR) {
            txCost = convertEthCostToTokenAmount(
                txCost, _feeToken, _tokenPriceInEth, _revertOnZeroPrice
            );
        }
    }

    function calcGasCostInEth(uint256 _gasUsed, uint256 _l1GasCostInEth)
        internal
        view
        returns (uint256 txCost)
    {
        uint256 gasPrice = tx.gasprice;

        // Gas price must be in a reasonable range.
        if (tx.gasprice > SANITY_GAS_PRICE) {
            gasPrice = SANITY_GAS_PRICE;
        }

        // Can't use more gas than the block gas limit.
        if (_gasUsed > block.gaslimit) {
            _gasUsed = block.gaslimit;
        }

        // Additional L1 gas cost must stay 0 for mainnet.
        if (block.chainid == 1 && _l1GasCostInEth > 0) {
            _l1GasCostInEth = 0;
        }

        txCost = (_gasUsed * gasPrice) + _l1GasCostInEth;
    }

    function convertEthCostToTokenAmount(
        uint256 _ethCost,
        address _feeToken,
        uint256 _tokenPriceInEth,
        bool _revertOnZeroPrice
    ) internal view returns (uint256 tokenAmount) {
        uint256 tokenDecimals = _feeToken.getTokenDecimals();

        if (tokenDecimals > 18) revert TokenDecimalsUnsupportedError(tokenDecimals);
        if (_tokenPriceInEth == 0) {
            if (_revertOnZeroPrice) revert ZeroTokenPriceInEthError();
            return 0;
        }

        tokenAmount = _wdiv(_ethCost, _tokenPriceInEth) / (10 ** (18 - tokenDecimals));
    }

    function capFeeAt20Percent(uint256 _feeAmount, uint256 _availableAmount)
        internal
        pure
        returns (uint256)
    {
        uint256 maxFeeAmount = _availableAmount / MAX_GAS_FEE_DIVIDER;

        if (_feeAmount > maxFeeAmount) {
            return maxFeeAmount;
        }

        return _feeAmount;
    }

    function _wdiv(uint256 _x, uint256 _y) private pure returns (uint256) {
        return ((_x * WAD) + (_y / 2)) / _y;
    }
}
