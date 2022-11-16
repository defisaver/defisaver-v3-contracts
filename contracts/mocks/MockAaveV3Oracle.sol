// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/chainlink/IAggregatorV3.sol";

contract MockAaveV3Oracle {
    mapping(address => address) tokenFeeds;

    function addFeeds(address[] memory _tokens, address[] memory _feeds) public {
        require(_tokens.length == _feeds.length);
        for (uint256 i = 0; i < _tokens.length; i++)
            tokenFeeds[_tokens[i]] = _feeds[i];
    }

    function getSourceOfAsset(address asset) external view returns (address) {
        return tokenFeeds[asset];
    }

    function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory prices) {
        prices = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            (, int256 price,,,) = IAggregatorV3(tokenFeeds[assets[i]]).latestRoundData();
            prices[i] = uint256(price);
        }
    }

    function vruh() public pure returns (bool) {
        return true;
    }
}