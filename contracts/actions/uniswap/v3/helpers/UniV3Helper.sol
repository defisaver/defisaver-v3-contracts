// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./MainnetUniV3Addresses.sol";

import "../../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

contract UniV3Helper is MainnetUniV3Addresses {

    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(POSITION_MANAGER_ADDR);
}