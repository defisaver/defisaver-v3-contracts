// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IWStEth } from "../../interfaces/protocols/lido/IWStEth.sol";
import { IFeedRegistry } from "../../interfaces/protocols/chainlink/IFeedRegistry.sol";
import { IAggregatorV3 } from "../../interfaces/protocols/chainlink/IAggregatorV3.sol";
import {
    IPoolAddressesProvider
} from "../../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IAaveV3Oracle } from "../../interfaces/protocols/aaveV3/IAaveV3Oracle.sol";
import {
    ISparkPoolAddressesProvider
} from "../../interfaces/protocols/spark/ISparkPoolAddressesProvider.sol";
import { ISparkV3Oracle } from "../../interfaces/protocols/spark/ISparkV3Oracle.sol";
import {
    ILendingPoolAddressesProviderV2
} from "../../interfaces/protocols/aaveV2/ILendingPoolAddressesProviderV2.sol";
import {
    IPriceOracleGetterAave
} from "../../interfaces/protocols/aaveV2/IPriceOracleGetterAave.sol";
import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { UtilAddresses } from "../addresses/UtilAddresses.sol";
import { Denominations } from "../Denominations.sol";

/// @title TokenPriceHelper
/// @notice Helper contract for fetching and formatting token prices from chainlink/aaveV3/spark/aaveV2
/// @dev Chainlink price staleness not checked, the risk has been deemed acceptable.
/// @dev BOLD token price is hardcoded to 1 USD; any depeg risk has been deemed acceptable.
/// @dev Assumptions:
/// - Chainlink ETH-denominated feeds return WAD-scaled prices (1e18).
/// - Chainlink USD-denominated feeds return prices scaled by 1e8.
/// - AaveV3 and Spark oracle prices are USD-denominated and scaled by 1e8.
/// - AaveV2 oracle prices are ETH-denominated and WAD-scaled.
contract TokenPriceHelper is DSMath, UtilAddresses {
    IFeedRegistry public constant FEED_REGISTRY = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    int256 internal constant USD_PRICE_SCALE = 1e8;
    address internal constant BOLD_ADDR = 0x6440f144b7e50D6a8439336510312d2F54beB01D;

    /// @notice Helper function that returns latest token price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @return priceInUSD Price of the token in USD, scaled by 1e8
    /// @dev For wstETH and WBTC chainlink feeds, the price is calculated from the price of stETH and BTC respectively.
    /// The price is calculated from the following sources:
    /// 1. Chainlink USD feed
    /// 2. Chainlink ETH feed
    /// 3. AaveV3 feed
    /// 4. Spark feed
    /// 5. AaveV2 feed
    /// If no price is found, return 0.
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256 priceInUSD) {
        bool ethFeedAsFallback = true;
        int256 price = _getAdjustedChainlinkPriceInUSD(_inputTokenAddr, ethFeedAsFallback);
        if (price != 0) return uint256(price);

        priceInUSD = getAaveV3TokenPriceInUSD(_inputTokenAddr);
        if (priceInUSD != 0) return priceInUSD;

        priceInUSD = getSparkTokenPriceInUSD(_inputTokenAddr);
        if (priceInUSD != 0) return priceInUSD;

        priceInUSD = getAaveTokenPriceInUSD(_inputTokenAddr);
        if (priceInUSD != 0) return priceInUSD;
    }

    /// @notice Helper function that returns latest token price in ETH
    /// @param _inputTokenAddr Token address we are looking the eth price for
    /// @return priceInETH Price of the token in ETH, scaled by 1e18
    /// @dev For wstETH and WBTC chainlink feeds, the price is calculated from the price of stETH and BTC respectively.
    /// The price is calculated from the following sources:
    /// 1. Chainlink USD feed
    /// 2. Chainlink ETH feed
    /// 3. AaveV3 feed
    /// 4. Spark feed
    /// 5. AaveV2 feed
    /// If no price is found, return 0.
    function getPriceInETH(address _inputTokenAddr) public view returns (uint256 priceInETH) {
        uint256 tokenPriceInUSD = uint256(_getAdjustedChainlinkPriceInUSD(_inputTokenAddr, false));
        if (tokenPriceInUSD != 0) {
            uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            if (ethPriceInUSD != 0) {
                priceInETH = wdiv(tokenPriceInUSD, ethPriceInUSD);
                return priceInETH;
            }
        }
        priceInETH = uint256(_getAdjustedChainlinkPriceInETH(_inputTokenAddr));
        if (priceInETH != 0) return priceInETH;

        priceInETH = getAaveV3TokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;

        priceInETH = getSparkTokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;

        priceInETH = getAaveTokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;
    }

    /*//////////////////////////////////////////////////////////////
                              CHAINLINK
    //////////////////////////////////////////////////////////////*/
    /// @notice Helper function that returns the latest chainlink price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _useFallback Whether to use the ETH price feed as fallback
    /// @return chainlinkPriceInUSD Chainlink price in USD, scaled by 1e8
    /// @dev If there's no USD price feed, we can fallback to ETH price feed, if there's no USD or ETH price feed return 0
    /// @dev BOLD token price is hardcoded to 1 USD; any depeg risk has been deemed acceptable.
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback)
        public
        view
        returns (int256 chainlinkPriceInUSD)
    {
        if (_inputTokenAddr == BOLD_ADDR) return USD_PRICE_SCALE;

        try FEED_REGISTRY.latestRoundData(_inputTokenAddr, Denominations.USD) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInUSD = _parseChainlinkPrice(answer);
        } catch {
            if (!_useFallback) return 0;
            uint256 tokenPriceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
            uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            chainlinkPriceInUSD = int256(wmul(tokenPriceInETH, ethPriceInUSD));
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
        try FEED_REGISTRY.latestRoundData(_inputTokenAddr, Denominations.ETH) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInETH = _parseChainlinkPrice(answer);
        } catch {
            chainlinkPriceInETH = 0;
        }
    }

    /// @notice Helper function that returns chainlink price data for a given round
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    /// @return priceInUSD Chainlink USD price answer after supported token adjustment
    /// @return updateTimestamp Timestamp of the price update
    /// @dev For wstETH and WBTC, the price is calculated from the price of stETH and BTC respectively.
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId)
        public
        view
        returns (uint256 priceInUSD, uint256 updateTimestamp)
    {
        address tokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);
        IAggregatorV3 aggregator =
            IAggregatorV3(FEED_REGISTRY.getFeed(tokenAddr, Denominations.USD));

        (priceInUSD, updateTimestamp) = getRoundInfo(_inputTokenAddr, _roundId, aggregator);
    }

    /// @notice Helper function that returns chainlink price data for a given round
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    /// @param _aggregator Chainlink aggregator
    /// @return priceInUSD Chainlink USD price answer after supported token adjustment
    /// @return updateTimestamp Timestamp of the price update
    /// @dev For wstETH and WBTC, the price is calculated from the price of stETH and BTC respectively. So:
    /// - For WBTC, caller must pass the BTC/USD feed as the aggregator.
    /// - For wstETH, caller must pass the stETH/USD feed as the aggregator.
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId, IAggregatorV3 _aggregator)
        public
        view
        returns (uint256 priceInUSD, uint256 updateTimestamp)
    {
        int256 signedPrice;
        (signedPrice, updateTimestamp) = _readChainlinkRound(_roundId, _aggregator);
        signedPrice = _applyChainlinkTokenAdjustment(_inputTokenAddr, signedPrice);

        priceInUSD = uint256(signedPrice);
    }

    /*//////////////////////////////////////////////////////////////
                              AAVE V3
    //////////////////////////////////////////////////////////////*/
    /// @notice Helper function that returns the AaveV3 token price in USD
    /// @param _tokenAddr Token address we are looking the usd price for
    /// @return price Price of the token in USD
    /// @dev If there is no price found, return 0.
    /// @dev By default, AaveV3 oracle stores prices in USD.
    function getAaveV3TokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = IPoolAddressesProvider(AAVE_V3_MARKET).getPriceOracle();

        try IAaveV3Oracle(priceOracleAddress).getAssetPrice(_tokenAddr) returns (
            uint256 tokenPrice
        ) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    /// @notice Helper function that returns the AaveV3 token price in ETH
    /// @param _tokenAddr Token address we are looking the eth price for
    /// @return price Price of the token in ETH
    /// @dev If there is no price found, return 0.
    /// @dev By default, AaveV3 oracle stores prices in USD, so we need to convert to ETH using the ETH price feed.
    function getAaveV3TokenPriceInETH(address _tokenAddr) public view returns (uint256) {
        uint256 tokenPriceInUSD = getAaveV3TokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
        if (tokenPriceInUSD == 0 || ethPriceInUSD == 0) return 0;

        return wdiv(tokenPriceInUSD, ethPriceInUSD);
    }

    /*//////////////////////////////////////////////////////////////
                              SPARK
    //////////////////////////////////////////////////////////////*/
    /// @notice Helper function that returns the Spark token price in USD
    /// @param _tokenAddr Token address we are looking the usd price for
    /// @return price Price of the token in USD
    /// @dev If there is no price found, return 0.
    /// @dev By default, Spark oracle stores prices in USD.
    function getSparkTokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ISparkPoolAddressesProvider(SPARK_MARKET).getPriceOracle();

        try ISparkV3Oracle(priceOracleAddress).getAssetPrice(_tokenAddr) returns (
            uint256 tokenPrice
        ) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    /// @notice Helper function that returns the Spark token price in ETH
    /// @param _tokenAddr Token address we are looking the eth price for
    /// @return price Price of the token in ETH
    /// @dev If there is no price found, return 0.
    /// @dev By default, Spark oracle stores prices in USD, so we need to convert to ETH using the ETH price feed.
    function getSparkTokenPriceInETH(address _tokenAddr) public view returns (uint256) {
        uint256 tokenPriceInUSD = getSparkTokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
        if (tokenPriceInUSD == 0 || ethPriceInUSD == 0) return 0;

        return wdiv(tokenPriceInUSD, ethPriceInUSD);
    }

    /*//////////////////////////////////////////////////////////////
                              AAVE V2
    //////////////////////////////////////////////////////////////*/
    /// @notice Helper function that returns the AaveV2 token price in ETH
    /// @param _tokenAddr Token address we are looking the eth price for
    /// @return price Price of the token in ETH
    /// @dev If there is no price found, return 0.
    /// @dev By default, AaveV2 oracle stores prices in ETH.
    function getAaveTokenPriceInETH(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (
            uint256 tokenPrice
        ) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    /// @notice Helper function that returns the AaveV2 token price in USD
    /// @param _tokenAddr Token address we are looking the usd price for
    /// @return price Price of the token in USD
    /// @dev If there is no price found, return 0.
    /// @dev By default, AaveV2 oracle stores prices in ETH, so we need to convert to USD using the ETH price feed.
    function getAaveTokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        uint256 tokenPriceInETH = getAaveTokenPriceInETH(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));

        price = wmul(tokenPriceInETH, ethPriceInUSD);
    }

    /*//////////////////////////////////////////////////////////////
                              HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Calculates the price of wstETH from the price of stETH
    /// @param _stEthPrice Price of stETH (can be in USD or ETH)
    /// @return wStEthPrice Price of wstETH (can be in USD or ETH)
    /// @dev Fetch price ratio from the WSTETH contract.
    function getWStEthPrice(int256 _stEthPrice) public view returns (int256 wStEthPrice) {
        if (_stEthPrice <= 0) return 0;
        wStEthPrice = int256(wmul(uint256(_stEthPrice), IWStEth(WSTETH_ADDR).stEthPerToken()));
    }

    /// @notice Helper function that returns the price of WBTC from the price of BTC
    /// @param _btcPrice Price of BTC (can be in USD or ETH)
    /// @return wBtcPrice Price of WBTC (can be in USD or ETH)
    /// @dev Fetch price ratio from the Chainlink feed.
    /// @dev Round to the nearest integer.
    function getWBtcPrice(int256 _btcPrice) public view returns (int256 wBtcPrice) {
        if (_btcPrice <= 0) return 0;

        try FEED_REGISTRY.latestRoundData(WBTC_ADDR, CHAINLINK_WBTC_ADDR) returns (
            uint80, int256 wBtcPriceToPeg, uint256, uint256, uint80
        ) {
            if (wBtcPriceToPeg <= 0) return _btcPrice;

            // Round to the nearest integer.
            wBtcPrice = (_btcPrice * wBtcPriceToPeg + USD_PRICE_SCALE / 2) / USD_PRICE_SCALE;
        } catch {
            // If the WBTC/BTC feed is unavailable, fall back to the unadjusted BTC price
            // to preserve fail-open behavior and avoid reverting upstream callers.
            wBtcPrice = _btcPrice;
        }
    }

    function _getAdjustedChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback)
        internal
        view
        returns (int256 price)
    {
        address chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);
        price = getChainlinkPriceInUSD(chainlinkTokenAddr, _useFallback);
        price = _applyChainlinkTokenAdjustment(_inputTokenAddr, price);
    }

    function _getAdjustedChainlinkPriceInETH(address _inputTokenAddr)
        internal
        view
        returns (int256 price)
    {
        address chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);
        price = getChainlinkPriceInETH(chainlinkTokenAddr);
        price = _applyChainlinkTokenAdjustment(_inputTokenAddr, price);
    }

    function _applyChainlinkTokenAdjustment(address _inputTokenAddr, int256 _price)
        internal
        view
        returns (int256 adjustedPrice)
    {
        if (_price <= 0) return 0;
        if (_inputTokenAddr == WSTETH_ADDR) return getWStEthPrice(_price);
        if (_inputTokenAddr == WBTC_ADDR) return getWBtcPrice(_price);
        return _price;
    }

    function _readChainlinkRound(uint80 _roundId, IAggregatorV3 _aggregator)
        internal
        view
        returns (int256 price, uint256 updateTimestamp)
    {
        // Price staleness not checked, the risk has been deemed acceptable.
        if (_roundId == 0) {
            (, price,, updateTimestamp,) = _aggregator.latestRoundData();
        } else {
            (, price,, updateTimestamp,) = _aggregator.getRoundData(_roundId);
        }

        price = _parseChainlinkPrice(price);
    }

    /// @notice Helper function that adjusts the token address for chainlink usage
    /// @param _inputTokenAddr Token address
    /// @return tokenAddrForChainlinkUsage Token address for chainlink usage
    /// @dev Chainlink uses different addresses for WBTC and ETH.
    /// @dev There is only STETH price feed so we use that for WSTETH and handle later.
    function getAddrForChainlinkOracle(address _inputTokenAddr)
        public
        pure
        returns (address tokenAddrForChainlinkUsage)
    {
        if (_inputTokenAddr == WETH_ADDR) {
            tokenAddrForChainlinkUsage = ETH_ADDR;
        } else if (_inputTokenAddr == WSTETH_ADDR) {
            tokenAddrForChainlinkUsage = STETH_ADDR;
        } else if (_inputTokenAddr == WBTC_ADDR) {
            tokenAddrForChainlinkUsage = CHAINLINK_WBTC_ADDR;
        } else {
            tokenAddrForChainlinkUsage = _inputTokenAddr;
        }
    }

    function _parseChainlinkPrice(int256 _answer) internal pure returns (int256 price) {
        price = _answer > 0 ? _answer : int256(0);
    }
}
