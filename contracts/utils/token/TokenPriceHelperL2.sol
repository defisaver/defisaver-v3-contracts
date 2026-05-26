// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFeedRegistry } from "../../interfaces/protocols/chainlink/IFeedRegistry.sol";
import {
    ILendingPoolAddressesProviderV2
} from "../../interfaces/protocols/aaveV2/ILendingPoolAddressesProviderV2.sol";
import {
    IPriceOracleGetterAave
} from "../../interfaces/protocols/aaveV2/IPriceOracleGetterAave.sol";
import { IAggregatorV3 } from "../../interfaces/protocols/chainlink/IAggregatorV3.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { UtilAddresses } from "../addresses/UtilAddresses.sol";
import { Denominations } from "../Denominations.sol";

/// @title TokenPriceHelperL2
/// @notice Helper contract for fetching and formatting token prices from chainlink/aave on L2
/// @dev Chainlink price staleness not checked, the risk has been deemed acceptable.
/// @dev Assumptions:
/// - Chainlink ETH-denominated feeds return WAD-scaled prices (1e18).
/// - Chainlink USD-denominated feeds return prices scaled by 1e8.
/// - Aave oracle prices are USD-denominated and scaled by 1e8.
contract TokenPriceHelperL2 is DSMath, UtilAddresses {
    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    /// @notice Helper function that returns chainlink price data for a given round
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    /// @param _aggregator Chainlink aggregator
    /// @return priceInUSD Chainlink USD price answer
    /// @return updateTimestamp Timestamp of the price update
    function getRoundInfo(uint80 _roundId, IAggregatorV3 _aggregator)
        public
        view
        returns (uint256 priceInUSD, uint256 updateTimestamp)
    {
        int256 signedPrice;

        // Price staleness not checked, the risk has been deemed acceptable.
        if (_roundId == 0) {
            (, signedPrice,, updateTimestamp,) = _aggregator.latestRoundData();
        } else {
            (, signedPrice,, updateTimestamp,) = _aggregator.getRoundData(_roundId);
        }
        signedPrice = _parseChainlinkPrice(signedPrice);

        priceInUSD = uint256(signedPrice);
    }

    /// @notice Helper function that returns chainlink price data for a given round
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    /// @return priceInUSD Chainlink USD price answer
    /// @return updateTimestamp Timestamp of the price update
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId)
        public
        view
        returns (uint256 priceInUSD, uint256 updateTimestamp)
    {
        IAggregatorV3 aggregator =
            IAggregatorV3(feedRegistry.getFeed(_inputTokenAddr, Denominations.USD));

        (priceInUSD, updateTimestamp) = getRoundInfo(_roundId, aggregator);
    }

    /// @notice Helper function that returns latest token price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @return priceInUSD Price of the token in USD, scaled by 1e8
    /// @dev 1. Aave feed
    /// @dev 2. Chainlink USD feed
    /// @dev 3. Chainlink ETH feed
    /// @dev If no price is found, return 0.
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256 priceInUSD) {
        int256 signedPrice;
        // 1. -> Try to get price from Aave feed.
        signedPrice = int256(getAaveTokenPriceInUSD(_inputTokenAddr));

        if (signedPrice == 0) {
            // 2. and 3. -> Try to get price from Chainlink USD feed with fallback to ETH feed.
            signedPrice = getChainlinkPriceInUSD(_inputTokenAddr, true);
        }

        priceInUSD = uint256(signedPrice);
    }

    /// @notice Helper function that returns latest token price in ETH
    /// @param _inputTokenAddr Token address we are looking the eth price for
    /// @return priceInETH Price of the token in ETH, scaled by 1e18
    /// @dev 1. Aave feed
    /// @dev 2. Chainlink USD feed
    /// @dev 3. Chainlink ETH feed
    /// @dev If no price is found, return 0.
    function getPriceInETH(address _inputTokenAddr) public view returns (uint256 priceInETH) {
        // 1. -> Try to get price from Aave feed.
        priceInETH = getAaveTokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;

        // 2. -> Try with USD price feed, if there is one, we can convert to ETH using the ETH price feed.
        uint256 chainlinkTokenPriceInUSD = uint256(getChainlinkPriceInUSD(_inputTokenAddr, false));

        if (chainlinkTokenPriceInUSD != 0) {
            uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            if (chainlinkETHPriceInUSD != 0) {
                priceInETH = wdiv(chainlinkTokenPriceInUSD, chainlinkETHPriceInUSD);
                return priceInETH;
            }
        }

        // 3. -> Try with ETH price feed.
        priceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
        if (priceInETH != 0) return priceInETH;

        // If no price is found, return 0.
        priceInETH = 0;
    }

    /// @notice Helper function that returns the latest chainlink price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _useFallback Whether to use the fallback price feed
    /// @return chainlinkPriceInUSD Chainlink price in USD, scaled by 1e8
    /// @dev If there's no USD price feed, we can fallback to ETH price feed, if there's no USD or ETH price feed return 0.
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback)
        public
        view
        returns (int256 chainlinkPriceInUSD)
    {
        try feedRegistry.latestRoundData(_inputTokenAddr, Denominations.USD) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInUSD = _parseChainlinkPrice(answer);
        } catch {
            if (_useFallback) {
                // Chainlink ETH-denominated feeds are expected to be scaled by 1e18.
                uint256 chainlinkPriceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
                uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
                chainlinkPriceInUSD = int256(wmul(chainlinkPriceInETH, chainlinkETHPriceInUSD));
            } else {
                chainlinkPriceInUSD = 0;
            }
        }
    }

    /// @notice Helper function that returns the latest chainlink price in ETH
    /// @param _inputTokenAddr Token address we are looking the eth price for
    /// @return chainlinkPriceInETH Chainlink price in ETH, scaled by 1e18
    /// @dev If there's no ETH price feed, return 0.
    function getChainlinkPriceInETH(address _inputTokenAddr)
        public
        view
        returns (int256 chainlinkPriceInETH)
    {
        try feedRegistry.latestRoundData(_inputTokenAddr, Denominations.ETH) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInETH = _parseChainlinkPrice(answer);
        } catch {
            chainlinkPriceInETH = 0;
        }
    }

    /// @notice Helper function that returns the Aave token price in ETH
    /// @param _tokenAddr Token address we are looking the eth price for
    /// @return price Price of the token in ETH, scaled by 1e18
    /// @dev If there is no price found, return 0.
    /// @dev By default, the Aave oracle stores prices in USD on L2, so we need to convert to ETH using the ETH price feed.
    function getAaveTokenPriceInETH(address _tokenAddr) public view returns (uint256 price) {
        uint256 tokenAavePriceInUSD = getAaveTokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
        if (tokenAavePriceInUSD == 0 || ethPriceInUSD == 0) return 0;

        price = wdiv(tokenAavePriceInUSD, ethPriceInUSD);
    }

    /// @notice Helper function that returns the Aave token price in USD
    /// @param _tokenAddr Token address we are looking the usd price for
    /// @return price Price of the token in USD, scaled by 1e8
    /// @dev If there is no price found, return 0.
    /// @dev By default, the Aave oracle stores prices in USD on L2.
    function getAaveTokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (
            uint256 tokenPrice
        ) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    function _parseChainlinkPrice(int256 _answer) internal pure returns (int256 price) {
        price = _answer > 0 ? _answer : int256(0);
    }
}
