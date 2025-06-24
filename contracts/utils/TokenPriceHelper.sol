// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../DS/DSMath.sol";
import { IWStEth } from "../interfaces/lido/IWStEth.sol";
import { UtilHelper } from "./helpers/UtilHelper.sol";
import { IFeedRegistry } from "../interfaces/chainlink/IFeedRegistry.sol";
import { Denominations } from "./Denominations.sol";
import { ILendingPoolAddressesProviderV2 } from "../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import { IPriceOracleGetterAave } from "../interfaces/aaveV2/IPriceOracleGetterAave.sol";
import { IAggregatorV3 } from "../interfaces/chainlink/IAggregatorV3.sol";

/// @title TokenPriceHelper Fetches prices from chainlink/aave and formats tokens properly
contract TokenPriceHelper is DSMath, UtilHelper {

    address internal constant BOLD_ADDR = 0x6440f144b7e50D6a8439336510312d2F54beB01D;

    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    /// @dev Helper function that returns chainlink price data
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId, IAggregatorV3 aggregator)
        public
        view
        returns (uint256, uint256 updateTimestamp)
    {
        int256 price;

        /// @dev Price staleness not checked, the risk has been deemed acceptable
        if (_roundId == 0) {
            (, price, , updateTimestamp, ) = aggregator.latestRoundData();
        } else {
            (, price, , updateTimestamp, ) = aggregator.getRoundData(_roundId);
        }

        // no price for wsteth, can calculate from steth
        if (_inputTokenAddr == WSTETH_ADDR) price = getWStEthPrice(price);

        return (uint256(price), updateTimestamp);
    }

    /// @dev Helper function that returns chainlink price data
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId)
        public
        view
        returns (uint256, uint256 updateTimestamp)
    {
        address tokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);
        IAggregatorV3 aggregator = IAggregatorV3(feedRegistry.getFeed(tokenAddr, Denominations.USD));

        return getRoundInfo(_inputTokenAddr, _roundId, aggregator);
    }

    /// @dev helper function that returns latest token price in USD
    /// @dev 1. Chainlink USD feed
    /// @dev 2. Chainlink ETH feed
    /// @dev 3. Aave feed
    /// @dev if no price found return 0
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256) {
        address chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        int256 price;
        price = getChainlinkPriceInUSD(chainlinkTokenAddr, true);
        if (price == 0){
            price = int256(getAaveTokenPriceInUSD(_inputTokenAddr));
        }
        if (price == 0){
            price = int256(getAaveV3TokenPriceInUSD(_inputTokenAddr));
        }
        if (price == 0){
            price = int256(getSparkTokenPriceInUSD(_inputTokenAddr));
        }
        if (price == 0){
            return 0;
        }

        if (_inputTokenAddr == WSTETH_ADDR) price = getWStEthPrice(price);
        if (_inputTokenAddr == WBTC_ADDR) price = getWBtcPrice(price);
        return uint256(price);
    }

    /// @dev helper function that returns latest token price in USD
    /// @dev 1. Chainlink USD feed
    /// @dev 2. Chainlink ETH feed
    /// @dev 3. Aave feed
    /// @dev if no price found return 0
    /// @dev expect WBTC and WSTETH to have chainlink USD price
    function getPriceInETH(address _inputTokenAddr) public view returns (uint256) {
        address chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        uint256 chainlinkPriceInUSD = uint256(getChainlinkPriceInUSD(chainlinkTokenAddr, false));
        if (chainlinkPriceInUSD != 0){
            uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            uint256 priceInEth = wdiv(chainlinkPriceInUSD, chainlinkETHPriceInUSD);
            if (_inputTokenAddr == WSTETH_ADDR) return uint256(getWStEthPrice(int256(priceInEth)));
            if (_inputTokenAddr == WBTC_ADDR) return uint256(getWBtcPrice(int256(priceInEth)));
            return priceInEth;
        }

        uint256 chainlinkPriceInETH = uint256(getChainlinkPriceInETH(chainlinkTokenAddr));
        if (chainlinkPriceInETH != 0) return chainlinkPriceInETH;

        uint256 aavePriceInETH = getAaveTokenPriceInETH(_inputTokenAddr);
        if (aavePriceInETH != 0) return aavePriceInETH;

        uint256 aaveV3PriceInETH = getAaveV3TokenPriceInETH(_inputTokenAddr);
        if (aaveV3PriceInETH != 0) return aaveV3PriceInETH;

        uint256 sparkPriceInETH = getSparkTokenPriceInETH(_inputTokenAddr);
        if (sparkPriceInETH != 0) return sparkPriceInETH;
        
        return 0;
    }

    /// @dev If there's no USD price feed can fallback to ETH price feed, if there's no USD or ETH price feed return 0
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback) public view returns (int256 chainlinkPriceInUSD) {
        if (_inputTokenAddr == BOLD_ADDR) return 100000000;
        try feedRegistry.latestRoundData(_inputTokenAddr, Denominations.USD) returns (uint80, int256 answer, uint256, uint256, uint80){
            chainlinkPriceInUSD = answer;
        } catch {
            if (_useFallback){
                uint256 chainlinkPriceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
                uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
                chainlinkPriceInUSD = int256(wmul(chainlinkPriceInETH, chainlinkETHPriceInUSD));
            } else {
                chainlinkPriceInUSD = 0;
            }
        }
    }

    /// @dev If there's no ETH price feed returns 0
    function getChainlinkPriceInETH(address _inputTokenAddr) public view returns (int256 chainlinkPriceInETH) {
        try feedRegistry.latestRoundData(_inputTokenAddr, Denominations.ETH) returns (uint80, int256 answer, uint256, uint256, uint80){
            chainlinkPriceInETH = answer;
        } catch {
            chainlinkPriceInETH = 0;
        }
    }
    
    /// @dev chainlink uses different addresses for WBTC and ETH
    /// @dev there is only STETH price feed so we use that for WSTETH and handle later 
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

    function getWStEthPrice(int256 _stEthPrice) public view returns (int256 wStEthPrice) {
        wStEthPrice = int256(wmul(uint256(_stEthPrice), IWStEth(WSTETH_ADDR).stEthPerToken()));
    }

    function getWBtcPrice(int256 _btcPrice) public view returns (int256 wBtcPrice) {
        (, int256 wBtcPriceToPeg, , , ) = feedRegistry.latestRoundData(WBTC_ADDR, CHAINLINK_WBTC_ADDR);
        wBtcPrice = (_btcPrice * wBtcPriceToPeg + 1e8 / 2) / 1e8;
    }

    /// @dev if price isn't found this returns 0
    function getAaveTokenPriceInETH(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (uint256 tokenPrice){
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    /// @dev if price isn't found this returns 0
    function getAaveTokenPriceInUSD(address _tokenAddr) public view returns (uint256) {
        uint256 tokenAavePriceInETH = getAaveTokenPriceInETH(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));

        return wmul(tokenAavePriceInETH, ethPriceInUSD);
    }

    function getAaveV3TokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_V3_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (uint256 tokenPrice) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    /// @dev if price isn't found this returns 0
    function getAaveV3TokenPriceInETH(address _tokenAddr) public view returns (uint256) {
        uint256 tokenAavePriceInUSD = getAaveV3TokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));

        return wdiv(tokenAavePriceInUSD, ethPriceInUSD);
    }

    function getSparkTokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(SPARK_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (uint256 tokenPrice) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }

    /// @dev if price isn't found this returns 0
    function getSparkTokenPriceInETH(address _tokenAddr) public view returns (uint256) {
        uint256 tokenSparkPriceInUSD = getSparkTokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));

        return wdiv(tokenSparkPriceInUSD, ethPriceInUSD);
    }
}
