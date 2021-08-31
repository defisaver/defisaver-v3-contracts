// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./MainnetUniV3Helper.sol";

import "../../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

contract UniV3Helper is MainnetUniV3Helper {

    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(POSITION_MANAGER_ADDR);
}