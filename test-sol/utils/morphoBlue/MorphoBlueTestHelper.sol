// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MarketParams } from "../../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import {
    MorphoBlueHelper
} from "../../../contracts/actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { MainnetMorphoBlueMarketsAddresses } from "./MainnetMorphoBlueMarketsAddresses.sol";

/// @notice Shared helper for MorphoBlue tests.
/// @dev The market list is network specific and comes from {Network}MorphoBlueMarketsAddresses,
///      which cmd/change-repo-network.js swaps together with every other *Addresses import.
///      `morphoBlue` is inherited from MorphoBlueHelper, so it is network correct as well.
contract MorphoBlueTestHelper is MorphoBlueHelper, MainnetMorphoBlueMarketsAddresses {
    /// @dev How many markets getMarkets() returns when not asked for all of them.
    uint256 internal constant DEFAULT_MARKETS_COUNT = 5;

    /// @notice Returns the first DEFAULT_MARKETS_COUNT markets supported on the selected network.
    function getMarkets() internal pure returns (MarketParams[] memory markets) {
        markets = getMarkets(false);
    }

    /// @notice Returns the markets supported on the selected network.
    /// @param _allMarkets If true, returns every market, otherwise only the first
    ///                    DEFAULT_MARKETS_COUNT of them.
    function getMarkets(bool _allMarkets) internal pure returns (MarketParams[] memory markets) {
        MarketParams[] memory allMarkets = getMorphoBlueMarkets();

        if (_allMarkets || allMarkets.length <= DEFAULT_MARKETS_COUNT) {
            return allMarkets;
        }

        markets = new MarketParams[](DEFAULT_MARKETS_COUNT);
        for (uint256 i = 0; i < DEFAULT_MARKETS_COUNT; ++i) {
            markets[i] = allMarkets[i];
        }
    }
}
