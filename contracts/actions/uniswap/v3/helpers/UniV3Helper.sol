// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetUniV3Addresses } from "./MainnetUniV3Addresses.sol";

import { IUniswapV3NonfungiblePositionManager } from
    "../../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

contract UniV3Helper is MainnetUniV3Addresses {
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(POSITION_MANAGER_ADDR);
}
