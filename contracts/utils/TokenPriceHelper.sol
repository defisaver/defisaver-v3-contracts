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
        address tokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        int256 price;

        if (_roundId == 0) {
            (, price, , updateTimestamp, ) = feedRegistry.latestRoundData(
                tokenAddr,
                Denominations.USD
            );
        } else {
            (, price, , updateTimestamp, ) = feedRegistry.getRoundData(
                tokenAddr,
                Denominations.USD,
                _roundId
            );
        }

        // no price for wsteth, can calculate from steth
        if (_inputTokenAddr == WSTETH_ADDR) price = getWStEthPrice(price);

        return (uint256(price), updateTimestamp);
        
    }

    /// @dev helper function that returns latest token price in USD
    function getPriceInUSD(address _inputTokenAddr) public view returns (uint256) {
        
        address tokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);

        int256 price;
        try this.getChainlinkPriceInUSD(tokenAddr) returns (int256 result) {
            price = result;
        } catch {
            price = 0;
        }

        if (_inputTokenAddr == WSTETH_ADDR) price = getWStEthPrice(price);

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

    function getAddrForChainlinkOracle(address _inputTokenAddr) public pure returns (address tokenAddrForChainlinkUsage) {
        if (_inputTokenAddr == WETH_ADDR) {
            tokenAddrForChainlinkUsage = ETH_ADDR;
        }else if (_inputTokenAddr == WSTETH_ADDR) {
            tokenAddrForChainlinkUsage = STETH_ADDR;
        }else if (_inputTokenAddr == WBTC_ADDR) {
            tokenAddrForChainlinkUsage = CHAINLINK_WBTC_ADDR;
        }else {
            tokenAddrForChainlinkUsage = _inputTokenAddr;
        }
    }
    
    function getWStEthPrice(int256 _stEthPrice) public view returns (int256 wStEthPrice){
        wStEthPrice = int256(wmul(uint256(_stEthPrice), IWStEth(WSTETH_ADDR).stEthPerToken()));
    }
}
