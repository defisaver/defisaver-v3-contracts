// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetUniV2Addresses } from "./MainnetUniV2Addresses.sol";
import { IUniswapV2Factory } from "../../../../interfaces/uniswap/IUniswapV2Factory.sol";
import { IUniswapRouter } from "../../../../interfaces/exchange/IUniswapRouter.sol";

contract UniV2Helper is MainnetUniV2Addresses {
    IUniswapRouter public constant router =
        IUniswapRouter(UNI_V2_ROUTER_ADDR);

    IUniswapV2Factory public constant factory =
        IUniswapV2Factory(UNI_V2_FACTORY_ADDR);

}