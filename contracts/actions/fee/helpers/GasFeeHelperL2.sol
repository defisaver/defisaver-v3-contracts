// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/FeeRecipient.sol";
import "../../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../../interfaces/aaveV2/IPriceOracleGetterAave.sol";

import "../../../utils/TokenPriceHelper.sol";


import "../helpers/MainnetFeeAddresses.sol";

contract GasFeeHelperL2 is DSMath, TokenPriceHelper {
    using TokenUtils for address;

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
            uint256 tokenPriceInUSD = getTokenPrice(_feeToken);
            uint256 wethPriceInUSD = getTokenPrice(TokenUtils.WETH_ADDR);
            uint256 tokenDecimals = _feeToken.getTokenDecimals();

            require(tokenDecimals <= 18, "Token decimal too big");

            uint256 tokenPriceInEth = wdiv(tokenPriceInUSD, wethPriceInUSD);

            txCost = wdiv(txCost, uint256(tokenPriceInEth)) / (10**(18 - tokenDecimals));

        }
    }

    function getTokenPrice(address _tokenAddr) public view returns (uint256 price) {
        /*
        address priceOracleAddress =
            ILendingPoolAddressesProviderV2(AAVE_MARKET).getPriceOracle();

        price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr);
        */
    }
}