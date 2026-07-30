// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFeedRegistry } from "../../interfaces/protocols/chainlink/IFeedRegistry.sol";
import { IAggregatorV3 } from "../../interfaces/protocols/chainlink/IAggregatorV3.sol";
import {
    IPoolAddressesProvider
} from "../../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IAaveV3Oracle } from "../../interfaces/protocols/aaveV3/IAaveV3Oracle.sol";
import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { UtilAddresses } from "../addresses/UtilAddresses.sol";
import { Denominations } from "../Denominations.sol";

/// @title TokenPriceHelperL2
/// @notice Helper contract for fetching and formatting token prices from chainlink/aaveV3 on L2
/// @dev Chainlink price staleness not checked, the risk has been deemed acceptable.
/// @dev Assumptions:
/// - Chainlink ETH-denominated feeds return WAD-scaled prices (1e18).
/// - Chainlink USD-denominated feeds return prices scaled by 1e8.
/// - AaveV3 oracle prices are USD-denominated and scaled by 1e8.
contract TokenPriceHelperL2 is DSMath, UtilAddresses {
    IFeedRegistry public constant FEED_REGISTRY = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    /// @notice Helper function that returns latest token price in USD
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @return priceInUSD Price of the token in USD, scaled by 1e8
    /// @dev The price is calculated from the following sources:
    /// 1. Chainlink USD feed
    /// 2. Chainlink ETH feed
    /// 3. AaveV3 feed
    /// If no price is found, return 0.
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256 priceInUSD) {
        bool ethFeedAsFallback = true;
        int256 price = getChainlinkPriceInUSD(_inputTokenAddr, ethFeedAsFallback);
        if (price != 0) return uint256(price);

        priceInUSD = getAaveV3TokenPriceInUSD(_inputTokenAddr);
        if (priceInUSD != 0) return priceInUSD;
    }

    /// @notice Helper function that returns latest token price in ETH
    /// @param _inputTokenAddr Token address we are looking the eth price for
    /// @return priceInETH Price of the token in ETH, scaled by 1e18
    /// @dev The price is calculated from the following sources:
    /// 1. Chainlink USD feed
    /// 2. Chainlink ETH feed
    /// 3. AaveV3 feed
    /// @dev If no price is found, return 0.
    function getPriceInETH(address _inputTokenAddr) public view returns (uint256 priceInETH) {
        uint256 tokenPriceInUSD = uint256(getChainlinkPriceInUSD(_inputTokenAddr, false));
        if (tokenPriceInUSD != 0) {
            uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            if (ethPriceInUSD != 0) {
                priceInETH = wdiv(tokenPriceInUSD, ethPriceInUSD);
                return priceInETH;
            }
        }

        priceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
        if (priceInETH != 0) return priceInETH;

        priceInETH = getAaveV3TokenPriceInETH(_inputTokenAddr);
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
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback)
        public
        view
        returns (int256 chainlinkPriceInUSD)
    {
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
    /// @return priceInUSD Chainlink USD price answer
    /// @return updateTimestamp Timestamp of the price update
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId)
        public
        view
        returns (uint256 priceInUSD, uint256 updateTimestamp)
    {
        IAggregatorV3 aggregator =
            IAggregatorV3(FEED_REGISTRY.getFeed(_inputTokenAddr, Denominations.USD));

        (priceInUSD, updateTimestamp) = getRoundInfo(_roundId, aggregator);
    }

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
        (signedPrice, updateTimestamp) = _readChainlinkRound(_roundId, _aggregator);

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
                              HELPERS
    //////////////////////////////////////////////////////////////*/
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

    function _parseChainlinkPrice(int256 _answer) internal pure returns (int256 price) {
        price = _answer > 0 ? _answer : int256(0);
    }
}
