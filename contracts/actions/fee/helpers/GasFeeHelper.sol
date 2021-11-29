// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/FeeRecipient.sol";
import "../../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../../interfaces/aaveV2/IPriceOracleGetterAave.sol";

contract GasFeeHelper is DSMath {
    using TokenUtils for address;

    FeeRecipient public constant feeRecipient =
        FeeRecipient(0x39C4a92Dc506300c3Ea4c67ca4CA611102ee6F2A);

    address public constant AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    uint256 public constant SANITY_GAS_PRICE = 1000 gwei;

    function calcGasCost(uint256 _gasUsed, address _feeToken) public view returns (uint256 txCost) {
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
        txCost = _gasUsed * gasPrice;

        // convert to token amount
        if (_feeToken != TokenUtils.WETH_ADDR) {
            uint256 price = getTokenPrice(_feeToken);
            uint256 tokenDecimals = _feeToken.getTokenDecimals();

            require(tokenDecimals <= 18, "Token decimal too big");

            txCost = wdiv(txCost, uint256(price)) / (10**(18 - tokenDecimals));
        }
    }

    function getTokenPrice(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress =
            ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr);
    }
}