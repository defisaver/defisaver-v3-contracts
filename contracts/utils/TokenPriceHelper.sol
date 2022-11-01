// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../DS/DSMath.sol";
import "../utils/TokenUtils.sol";
import "../interfaces/lido/IWStEth.sol";
import "./helpers/UtilHelper.sol";
import "../interfaces/chainlink/IFeedRegistry.sol";
import "./Denominations.sol";
import "../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../interfaces/aaveV2/IPriceOracleGetterAave.sol";
import "../interfaces/chainlink/IAggregatorV3.sol";

/// @title TokenPriceHelper Fetches prices from chainlink/aave and formats tokens properly
contract TokenPriceHelper is DSMath, UtilHelper {
    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    TokenPriceHelper private immutable _this;
    constructor() {
        _this = this;
    }

    /// @dev Helper function that returns chainlink price data
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId, IAggregatorV3 aggregator)
        public
        view
        returns (uint256, uint256 updateTimestamp)
    {
        int256 price;

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
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256) {
        address tokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        int256 price;
        try _this.getChainlinkPriceInUSD(tokenAddr) returns (int256 result) {
            price = result;
        } catch {
            price = int256(getAaveTokenPriceInUSD(tokenAddr));
        }

        if (_inputTokenAddr == WSTETH_ADDR) price = getWStEthPrice(price);

        return uint256(price);
    }

    function getPriceInETH(address _inputTokenAddr) public view returns (uint256) {
        uint256 tokenUSDPrice = getPriceInUSD(_inputTokenAddr);

        if (tokenUSDPrice == 0) {
            tokenUSDPrice = getAaveTokenPriceInUSD(_inputTokenAddr);
        }

        uint256 ethUSDPrice = getPriceInUSD(ETH_ADDR);

        return wdiv(tokenUSDPrice, ethUSDPrice);
    }

    function getChainlinkPriceInUSD(address _inputTokenAddr) public view returns (int256 price) {
        (, price, , , ) = feedRegistry.latestRoundData(_inputTokenAddr, Denominations.USD);
    }

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

    function getAaveTokenPriceInETH(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_MARKET).getPriceOracle();

        price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr);
    }

    function getAaveTokenPriceInUSD(address _tokenAddr) public view returns (uint256) {
        uint256 tokenAavePriceInETH = getAaveTokenPriceInETH(_tokenAddr);
        uint256 ethPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR));

        return wmul(tokenAavePriceInETH, ethPriceInUSD);
    }
}
