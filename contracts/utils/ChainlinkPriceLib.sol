// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFeedRegistry } from "../interfaces/protocols/chainlink/IFeedRegistry.sol";
import { IWStEth } from "../interfaces/protocols/lido/IWStEth.sol";
import { Denominations } from "./Denominations.sol";

/// @title ChainlinkPriceLib Simple library for fetching a token's USD price from Chainlink.
/// @dev Uses the Chainlink Feed Registry for the current chain. Prices are returned with 8 decimals. Returns 0 if no feed exists.
library ChainlinkPriceLib {
    error UnsupportedChain(uint256 chainId);

    uint256 internal constant WAD = 10 ** 18;

    address internal constant BOLD_ADDR = 0x6440f144b7e50D6a8439336510312d2F54beB01D;
    address internal constant WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WSTETH_ADDR = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
    address internal constant STETH_ADDR = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address internal constant WBTC_ADDR = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address internal constant CHAINLINK_WBTC_ADDR = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB;

    /// @dev If the token has no USD feed, will fallback to using the ETH feed and the ETH/USD feed to calculate the USD price.
    /// @notice Reverts if the chain is not supported.
    /// @param _inputTokenAddr Token address to fetch the USD price for.
    /// @return uint256 - Returns the latest USD price (8 decimals) for a token, or 0 if no feed exists.

    function getPriceInUSD(address _inputTokenAddr) internal view returns (uint256) {
        address chainlinkTokenAddr = _inputTokenAddr;

        if (block.chainid == 1) {
            if (_inputTokenAddr == BOLD_ADDR) return 100_000_000;
            chainlinkTokenAddr = getAddrForChainlinkOracle(_inputTokenAddr);
        }

        int256 price = getChainlinkPriceInUSD(chainlinkTokenAddr, true);
        if (price == 0) {
            return 0;
        }

        if (block.chainid == 1) {
            if (_inputTokenAddr == WSTETH_ADDR) price = getWStEthPrice(price);
            if (_inputTokenAddr == WBTC_ADDR) price = getWBtcPrice(price);
        }

        return uint256(price);
    }

    /// @dev If there's no USD price feed can fallback to ETH price feed, if there's no USD or ETH price feed return 0
    function getChainlinkPriceInUSD(address _inputTokenAddr, bool _useFallback)
        internal
        view
        returns (int256 chainlinkPriceInUSD)
    {
        try getFeedRegistry().latestRoundData(_inputTokenAddr, Denominations.USD) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInUSD = answer;
        } catch {
            if (_useFallback) {
                uint256 chainlinkPriceInETH = uint256(getChainlinkPriceInETH(_inputTokenAddr));
                uint256 chainlinkETHPriceInUSD = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
                chainlinkPriceInUSD = int256(wmul(chainlinkPriceInETH, chainlinkETHPriceInUSD));
            } else {
                chainlinkPriceInUSD = 0;
            }
        }
    }

    /// @dev If there's no ETH price feed returns 0
    function getChainlinkPriceInETH(address _inputTokenAddr)
        internal
        view
        returns (int256 chainlinkPriceInETH)
    {
        try getFeedRegistry().latestRoundData(_inputTokenAddr, Denominations.ETH) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInETH = answer;
        } catch {
            chainlinkPriceInETH = 0;
        }
    }

    /// @dev Returns the Chainlink Feed Registry deployed on the current chain.
    function getFeedRegistry() internal view returns (IFeedRegistry) {
        uint256 chainId = block.chainid;

        if (chainId == 1) return IFeedRegistry(0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf);
        if (chainId == 10) return IFeedRegistry(0x7E3D9e4E620842d61aB111a6DbF1be5a8cc91774);
        if (chainId == 8453) return IFeedRegistry(0x7dFF34190d0307fC234fc7E8C152C9715083eB02);
        if (chainId == 42_161) return IFeedRegistry(0x158E27De8B5E5bC3FA1C6D5b365a291c54f6b0Fd);
        if (chainId == 59_144) return IFeedRegistry(0x2D8BFD9FF88E3106ce7214621b0770c1578749A1);
        if (chainId == 9745) return IFeedRegistry(0x2226836ec16FF5974dFD8DF740CD461B42FAffD5);

        revert UnsupportedChain(chainId);
    }

    /// @dev chainlink uses different addresses for WBTC and ETH
    /// @dev there is only STETH price feed so we use that for WSTETH and handle later
    function getAddrForChainlinkOracle(address _inputTokenAddr)
        internal
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

    function getWStEthPrice(int256 _stEthPrice) internal view returns (int256 wStEthPrice) {
        wStEthPrice = int256(wmul(uint256(_stEthPrice), IWStEth(WSTETH_ADDR).stEthPerToken()));
    }

    function getWBtcPrice(int256 _btcPrice) internal view returns (int256 wBtcPrice) {
        (, int256 wBtcPriceToPeg,,,) =
            getFeedRegistry().latestRoundData(WBTC_ADDR, CHAINLINK_WBTC_ADDR);
        wBtcPrice = (_btcPrice * wBtcPriceToPeg + 1e8 / 2) / 1e8;
    }

    function wmul(uint256 x, uint256 y) private pure returns (uint256 z) {
        z = (x * y + WAD / 2) / WAD;
    }
}
