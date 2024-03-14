// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../DS/DSMath.sol";
import "./helpers/UtilHelper.sol";
import "../interfaces/chainlink/IFeedRegistry.sol";
import "./Denominations.sol";
import "../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../interfaces/aaveV2/IPriceOracleGetterAave.sol";
import "../interfaces/chainlink/IAggregatorV3.sol";

/// @title TokenPriceHelperL2 Fetches prices from chainlink/aave and formats tokens properly on L2
contract TokenPriceHelperL2 is DSMath, UtilHelper {
    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    /// @dev Helper function that returns chainlink price data
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    function getRoundInfo(uint80 _roundId, IAggregatorV3 aggregator)
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
        IAggregatorV3 aggregator = IAggregatorV3(feedRegistry.getFeed(_inputTokenAddr, Denominations.USD));

        return getRoundInfo(_roundId, aggregator);
    }

    /// @dev helper function that returns latest token price in USD
    /// @dev 1. Aave feed
    /// @dev 2. Chainlink USD feed
    /// @dev 3. Chainlink ETH feed
    /// @dev if no price found return 0
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256) {

        int256 price;
        price = int256(getAaveTokenPriceInUSD(_inputTokenAddr));
        
        if (price == 0){
            price = getChainlinkPriceInUSD(_inputTokenAddr, true);
        }
        return uint256(price);
    }

    /// @dev helper function that returns latest token price in USD
    /// @dev 1. Aave feed
    /// @dev 2. Chainlink USD feed
    /// @dev 3. Chainlink ETH feed
    /// @dev if no price found return 0
    /// @dev expect WBTC and WSTETH to have chainlink USD price
    function getPriceInETH(address _inputTokenAddr) public view returns (uint256) {

        uint256 aavePriceInETH = getAaveTokenPriceInETH(_inputTokenAddr);
        if (aavePriceInETH != 0) return aavePriceInETH;

        uint256 chainlinkPriceInUSD = uint256(getChainlinkPriceInUSD(_inputTokenAddr, false));

        if (chainlinkPriceInUSD != 0){
            uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            uint256 priceInEth = wdiv(chainlinkPriceInUSD, chainlinkETHPriceInUSD);
            return priceInEth;
        }

        uint256 chainlinkPriceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
        if (chainlinkPriceInETH != 0) return chainlinkPriceInETH;
        
        return 0;
    }

    /// @dev If there's no USD price feed can fallback to ETH price feed, if there's no USD or ETH price feed return 0
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback) public view returns (int256 chainlinkPriceInUSD) {
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

    /// @dev if price isn't found this returns 0
    function getAaveTokenPriceInETH(address _tokenAddr) public view returns (uint256) {
        uint256 tokenAavePriceInUSD = getAaveTokenPriceInUSD(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));

        return wdiv(tokenAavePriceInUSD, ethPriceInUSD);
    }

    /// @dev if price isn't found this returns 0
    function getAaveTokenPriceInUSD(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_MARKET).getPriceOracle();

        try IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr) returns (uint256 tokenPrice) {
            price = tokenPrice;
        } catch {
            price = 0;
        }
    }
}
