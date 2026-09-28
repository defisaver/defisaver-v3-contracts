// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IFlyDexAggregator {
    function updateAmountIn(bytes memory data, uint256 amountIn)
        external
        pure
        returns (bytes memory);
}
