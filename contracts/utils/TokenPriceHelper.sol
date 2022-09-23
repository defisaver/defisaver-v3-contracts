// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../DS/DSMath.sol";
import "../utils/TokenUtils.sol";
import "../interfaces/lido/IWStEth.sol";
import "./helpers/UtilHelper.sol";
import "../interfaces/chainlink/IFeedRegistry.sol";
import "./Denominations.sol";

contract TokenPriceHelper is DSMath, UtilHelper {

    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    function getRoundInfo(address _inputTokenAddr, uint80 _roundId) public view returns (uint256, uint256 updateTimestamp) {
        address tokenAddr = _inputTokenAddr;

        if (_inputTokenAddr == TokenUtils.WETH_ADDR) {
            tokenAddr = TokenUtils.ETH_ADDR;
        }

        if (_inputTokenAddr == WSTETH_ADDR) {
            tokenAddr = STETH_ADDR;
        }

        int256 chainlinkPrice;

        if (_roundId == 0) {
            (, chainlinkPrice, , updateTimestamp, ) = feedRegistry.latestRoundData(
                tokenAddr,
                Denominations.USD
            );
        } else {
            (, chainlinkPrice, , updateTimestamp, ) = feedRegistry.getRoundData(
                tokenAddr,
                Denominations.USD,
                _roundId
            );
        }

        // no price for wsteth, can calculate from steth
        if (_inputTokenAddr == WSTETH_ADDR) {
            return (
                wmul(uint256(chainlinkPrice), IWStEth(WSTETH_ADDR).stEthPerToken()),
                updateTimestamp
            );
        }

        return (uint256(chainlinkPrice), updateTimestamp);
        
    }

    /// @dev helper function that returns latest token price in USD
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256) {
        address tokenAddr = _inputTokenAddr;

        if (_inputTokenAddr == WETH_ADDR) {
            tokenAddr = ETH_ADDR;
        }

        if (_inputTokenAddr == WSTETH_ADDR) {
            tokenAddr = STETH_ADDR;
        }

        if (_inputTokenAddr == WBTC_ADDR) {
            tokenAddr = CHAINLINK_WBTC_ADDR;
        }

        int256 price;
        try this.getChainlinkPriceInUSD(tokenAddr) returns (int256 result) {
            price = result;
        } catch {
            price = 0;
        }

        if (_inputTokenAddr == WSTETH_ADDR) {
            return wmul(uint256(price), IWStEth(WSTETH_ADDR).stEthPerToken());
        }

        return uint256(price);
    }

    function getPriceInETH(address _inputTokenAddr) public view returns (uint256) {
        uint256 tokenUSDPrice = getPriceInUSD(_inputTokenAddr);
        uint256 ethUSDPrice = getPriceInUSD(ETH_ADDR);

        return wdiv(tokenUSDPrice, ethUSDPrice);
    }


    function getChainlinkPriceInUSD(address _inputTokenAddr) public view returns (int256 price) {
        (, price, , , ) = feedRegistry.latestRoundData(_inputTokenAddr, Denominations.USD);
    }
}
