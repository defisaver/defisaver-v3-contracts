
// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity = 0.8.10;

interface IUniswapV3FlashCallback {
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes memory data
    ) external;
}