// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./MainnetUniV2Helper.sol";
import "../../../../interfaces/uniswap/IUniswapV2Factory.sol";
import "../../../../interfaces/exchange/IUniswapRouter.sol";

contract UniV2Helper is MainnetUniV2Helper {
    IUniswapRouter public constant router =
        IUniswapRouter(UNI_V2_ROUTER_ADDR);

    IUniswapV2Factory public constant factory =
        IUniswapV2Factory(UNI_V2_FACTORY_ADDR);

}