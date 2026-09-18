// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @title Mock Spark price oracle used in tests.
/// @dev Replaces the real SparkOracle (via hardhat_setCode) whose Chronicle/Aggor
/// feeds revert once tests time travel past the feeds' staleness window.
contract MockSparkOracle {
    mapping(address => uint256) public prices;

    function setPrices(address[] memory _assets, uint256[] memory _prices) public {
        require(_assets.length == _prices.length);
        for (uint256 i = 0; i < _assets.length; i++) {
            prices[_assets[i]] = _prices[i];
        }
    }

    function getAssetPrice(address _asset) public view returns (uint256) {
        return prices[_asset];
    }

    function getAssetsPrices(address[] calldata _assets)
        external
        view
        returns (uint256[] memory _prices)
    {
        _prices = new uint256[](_assets.length);
        for (uint256 i = 0; i < _assets.length; i++) {
            _prices[i] = prices[_assets[i]];
        }
    }

    // solhint-disable-next-line func-name-mixedcase
    function BASE_CURRENCY() external pure returns (address) {
        return address(0); // USD base, same as real SparkOracle
    }

    // solhint-disable-next-line func-name-mixedcase
    function BASE_CURRENCY_UNIT() external pure returns (uint256) {
        return 1e8;
    }
}
