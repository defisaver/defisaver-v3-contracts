// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MarketParams } from "../../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import {
    MorphoBlueHelper
} from "../../../contracts/actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { MainnetMorphoBlueMarketsAddresses } from "./MainnetMorphoBlueMarketsAddresses.sol";
import { BaseTest } from "../BaseTest.sol";

/// @notice Shared helper for MorphoBlue tests.
/// @dev The market list is network specific and comes from {Network}MorphoBlueMarketsAddresses,
///      which cmd/change-repo-network.js swaps together with every other *Addresses import.
///      `morphoBlue` is inherited from MorphoBlueHelper, so it is network correct as well.
contract MorphoBlueTestHelper is BaseTest, MorphoBlueHelper, MainnetMorphoBlueMarketsAddresses {
    /// @dev How many markets getMarkets() returns when not asked for all of them.
    uint256 internal constant DEFAULT_MARKETS_COUNT = 5;

    /// @dev Dedicated lender used to seed markets, kept apart from the accounts under test.
    address internal constant MARKET_LIQUIDITY_PROVIDER = address(0x119);

    error NoMarketForChain(uint256 chainId);

    function getMarketForChain() internal view returns (MarketParams memory market) {
        // wstETH/ETH  0xb8fc70e82bc5bb53e773626fcc6a23f7eefa036918d7ef216ecfb1950a94a85e
        if (block.chainid == 1) {
            return MarketParams({
                loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
                collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
                oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
                irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                lltv: 965_000_000_000_000_000
            });
        }
        // wstETH/ETH  0x6aa81f51dfc955df598e18006deae56ce907ac02b0b5358705f1a28fcea23cc0
        if (block.chainid == 8453) {
            return MarketParams({
                loanToken: 0x4200000000000000000000000000000000000006,
                collateralToken: 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452,
                oracle: 0xaE10cbdAa587646246c8253E4532A002EE4fa7A4,
                irm: 0x46415998764C29aB2a25CbeA6254146D50D22687,
                lltv: 965_000_000_000_000_000
            });
        }
        // ETH/USDC  0xca83d02be579485cc10945c9597a6141e772f1cf0e0aa28d09a327b6cbd8642c
        if (block.chainid == 42_161) {
            return MarketParams({
                loanToken: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
                collateralToken: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
                oracle: 0x282FEB10549fde52bD61A6979424Ddf18A4971A2,
                irm: 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA,
                lltv: 860_000_000_000_000_000
            });
        }

        revert NoMarketForChain(block.chainid);
    }

    /// @notice Supplies loan token liquidity to a market so later borrows have something to draw
    ///         from. Forked markets are often close to fully utilized, which makes borrows revert
    ///         with "insufficient liquidity".
    /// @param _market Market to seed.
    /// @param _amountUsd Liquidity to supply, in whole USD.
    function supplyMarketLiquidity(MarketParams memory _market, uint256 _amountUsd) internal {
        uint256 supplyAmount = amountInUSDPrice(_market.loanToken, _amountUsd);
        // gibTokens instead of give: loan tokens vary per market and a direct balance write works
        // for all of them, including the ones give() has to buy on Uniswap.
        gibTokens(MARKET_LIQUIDITY_PROVIDER, _market.loanToken, supplyAmount);

        startPrank(MARKET_LIQUIDITY_PROVIDER);
        approve(_market.loanToken, address(morphoBlue), supplyAmount);
        morphoBlue.supply(_market, supplyAmount, 0, MARKET_LIQUIDITY_PROVIDER, "");
        stopPrank();
    }

    /// @notice Returns the first DEFAULT_MARKETS_COUNT markets supported on the selected network.
    function getMarkets() internal pure returns (MarketParams[] memory markets) {
        markets = getMarkets(false);
    }

    /// @notice Returns the markets supported on the selected network.
    /// @param _allMarkets If true, returns every market, otherwise only the first
    ///                    DEFAULT_MARKETS_COUNT of them.
    function getMarkets(bool _allMarkets) internal pure returns (MarketParams[] memory markets) {
        MarketParams[] memory allMarkets = getMorphoBlueMarkets();

        if (_allMarkets || allMarkets.length <= DEFAULT_MARKETS_COUNT) {
            return allMarkets;
        }

        markets = new MarketParams[](DEFAULT_MARKETS_COUNT);
        for (uint256 i = 0; i < DEFAULT_MARKETS_COUNT; ++i) {
            markets[i] = allMarkets[i];
        }
    }
}
