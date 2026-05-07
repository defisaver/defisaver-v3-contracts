// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IWStEth } from "../../interfaces/protocols/lido/IWStEth.sol";
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

/// @title TokenPriceHelper
/// @notice Helper contract for fetching and formatting token prices from chainlink/aave
/// @dev Chainlink price staleness not checked, the risk has been deemed acceptable.
/// @dev Assumptions:
/// - Chainlink ETH-denominated feeds return WAD-scaled prices (1e18).
/// - Chainlink USD-denominated feeds return prices scaled by 1e8.
/// - AaveV2 oracle prices are ETH-denominated and WAD-scaled.
/// - AaveV3 and Spark oracle prices are USD-denominated and scaled by 1e8.
contract TokenPriceHelper is DSMath, UtilAddresses {
    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    int256 internal constant USD_PRICE_SCALE = 1e8;
    address internal constant BOLD_ADDR = 0x6440f144b7e50D6a8439336510312d2F54beB01D;

    /// @notice Helper function that returns chainlink price data for a given round
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    /// @param _aggregator Chainlink aggregator
    /// @return priceInUSD Chainlink USD price answer after supported token adjustment
    /// @return updateTimestamp Timestamp of the price update
    /// @dev For wstETH, the price is calculated from the price of stETH.
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId, IAggregatorV3 _aggregator)
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

        // No direct feed for wstETH, so we calculate price from stETH.
        if (_inputTokenAddr == WSTETH_ADDR) signedPrice = getWStEthPrice(signedPrice);

        priceInUSD = uint256(signedPrice);
    }

    /// @notice Helper function that returns chainlink price data for a given round
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    /// @return priceInUSD Chainlink USD price answer after supported token adjustment
    /// @return updateTimestamp Timestamp of the price update
    /// @dev For wstETH, the price is calculated from the price of stETH.
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId)
        public
        view
        returns (uint256 priceInUSD, uint256 updateTimestamp)
    {
        address tokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);
        IAggregatorV3 aggregator = IAggregatorV3(feedRegistry.getFeed(tokenAddr, Denominations.USD));

        (priceInUSD, updateTimestamp) = getRoundInfo(_inputTokenAddr, _roundId, aggregator);
    }

    /// @notice Helper function that returns latest token price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @return priceInUSD Price of the token in USD, scaled by 1e8
    /// @dev For wstETH and WBTC, the price is calculated from the price of stETH and BTC respectively.
    /// @dev The price is calculated from the following sources:
    /// @dev 1. Chainlink USD feed
    /// @dev 2. Chainlink ETH feed
    /// @dev 3. Aave feed
    /// @dev 4. AaveV3 feed
    /// @dev 5. Spark feed
    /// @dev If no price is found, return 0.
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256 priceInUSD) {
        address chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        int256 signedPrice;
        // 1. and 2. -> Try to get price from chainlink USD feed with fallback to ETH feed
        signedPrice = getChainlinkPriceInUSD(chainlinkTokenAddr, true);
        if (signedPrice == 0) {
            // 3. -> Try to get price from Aave feed
            signedPrice = int256(getAaveTokenPriceInUSD(_inputTokenAddr));
        }
        if (signedPrice == 0) {
            // 4. -> Try to get price from AaveV3 feed
            signedPrice = int256(getAaveV3TokenPriceInUSD(_inputTokenAddr));
        }
        if (signedPrice == 0) {
            // 5. -> Try to get price from Spark feed
            signedPrice = int256(getSparkTokenPriceInUSD(_inputTokenAddr));
        }
        if (signedPrice == 0) {
            // If no price is found, return 0.
            return 0;
        }

        // Handle special cases for wstETH and WBTC.
        if (_inputTokenAddr == WSTETH_ADDR) signedPrice = getWStEthPrice(signedPrice);
        if (_inputTokenAddr == WBTC_ADDR) signedPrice = getWBtcPrice(signedPrice);

        priceInUSD = uint256(signedPrice);
    }

    /// @notice Helper function that returns latest token price in ETH
    /// @param _inputTokenAddr Token address we are looking the eth price for
    /// @return priceInETH Price of the token in ETH, scaled by 1e18
    /// @dev For wstETH and WBTC, the price is calculated from the price of stETH and BTC respectively.
    /// @dev The price is calculated from the following sources:
    /// @dev 1. Chainlink USD feed
    /// @dev 2. Chainlink ETH feed
    /// @dev 3. Aave feed
    /// @dev 4. AaveV3 feed
    /// @dev 5. Spark feed
    /// @dev If no price is found, return 0.
    /// @dev Expect WBTC (BTC) and WSTETH (stETH) to have chainlink USD price.
    function getPriceInETH(address _inputTokenAddr) public view returns (uint256 priceInETH) {
        address chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        // 1. -> Try with USD price feed, if there is one, we can convert to ETH using the ETH price feed.
        uint256 chainlinkTokenPriceInUSD =
            uint256(getChainlinkPriceInUSD(chainlinkTokenAddr, false));
        if (chainlinkTokenPriceInUSD != 0) {
            uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            if (chainlinkETHPriceInUSD != 0) {
                priceInETH = wdiv(chainlinkTokenPriceInUSD, chainlinkETHPriceInUSD);

                // Handle special cases for wstETH and WBTC.
                if (_inputTokenAddr == WSTETH_ADDR) {
                    priceInETH = uint256(getWStEthPrice(int256(priceInETH)));
                }
                if (_inputTokenAddr == WBTC_ADDR) {
                    priceInETH = uint256(getWBtcPrice(int256(priceInETH)));
                }

                return priceInETH;
            }
        }

        // 2. -> Try with ETH price feed.
        priceInETH = uint256(getChainlinkPriceInETH(chainlinkTokenAddr));
        if (priceInETH != 0) return priceInETH;

        // 3. -> Try with Aave price feed.
        priceInETH = getAaveTokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;

        // 4. -> Try with AaveV3 price feed.
        priceInETH = getAaveV3TokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;

        // 5. -> Try with Spark price feed.
        priceInETH = getSparkTokenPriceInETH(_inputTokenAddr);
        if (priceInETH != 0) return priceInETH;

        // If no price is found, return 0.
        priceInETH = 0;
    }

    /// @notice Helper function that returns the latest chainlink price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _useFallback Whether to use the fallback price feed
    /// @return chainlinkPriceInUSD Chainlink price in USD, scaled by 1e8
    /// @dev If there's no USD price feed, we can fallback to ETH price feed, if there's no USD or ETH price feed return 0
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback)
        public
        view
        returns (int256 chainlinkPriceInUSD)
    {
        if (_inputTokenAddr == BOLD_ADDR) return USD_PRICE_SCALE;

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
        (, int256 wBtcPriceToPeg,,,) = feedRegistry.latestRoundData(WBTC_ADDR, CHAINLINK_WBTC_ADDR);
        // Round to the nearest integer.
        wBtcPrice = (_btcPrice * wBtcPriceToPeg + USD_PRICE_SCALE / 2) / USD_PRICE_SCALE;
    }

    function _parseChainlinkPrice(int256 _answer) internal pure returns (int256 price) {
        price = _answer > 0 ? _answer : int256(0);
    }

    /*//////////////////////////////////////////////////////////////
                              AAVE V2
    //////////////////////////////////////////////////////////////*/
    /// @notice Helper function that returns the Aave token price in ETH
    /// @param _tokenAddr Token address we are looking the eth price for
    /// @return price Price of the token in ETH
    /// @dev If there is no price found, return 0.
    /// @dev By default, Aave oracle stores prices in ETH.
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

    /// @notice Helper function that returns the Aave token price in USD
    /// @param _tokenAddr Token address we are looking the usd price for
    /// @return price Price of the token in USD
    /// @dev If there is no price found, return 0.
    /// @dev By default, Aave oracle stores prices in ETH, so we need to convert to USD using the ETH price feed.
    function getAaveTokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        uint256 tokenAavePriceInETH = getAaveTokenPriceInETH(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));

        price = wmul(tokenAavePriceInETH, ethPriceInUSD);
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
        address priceOracleAddress =
            ILendingPoolAddressesProviderV2(AAVE_V3_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (
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
        uint256 tokenAavePriceInUSD = getAaveV3TokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
        if (tokenAavePriceInUSD == 0 || ethPriceInUSD == 0) return 0;

        return wdiv(tokenAavePriceInUSD, ethPriceInUSD);
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
        address priceOracleAddress = ILendingPoolAddressesProviderV2(SPARK_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (
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
        uint256 tokenSparkPriceInUSD = getSparkTokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
        if (tokenSparkPriceInUSD == 0 || ethPriceInUSD == 0) return 0;

        return wdiv(tokenSparkPriceInUSD, ethPriceInUSD);
    }
}
