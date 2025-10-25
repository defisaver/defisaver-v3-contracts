// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IUniswapV2Pair } from "../interfaces/uniswap/IUniswapV2Pair.sol";
import { IUniswapV2Factory } from "../interfaces/uniswap/IUniswapV2Factory.sol";

contract SushiView {
    address public constant UNISWAP_V2_FACTORY_ADDR = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    IUniswapV2Factory public constant UniswapV2Factory = IUniswapV2Factory(UNISWAP_V2_FACTORY_ADDR);

    function getPairInfo(address _pair)
        external
        view
        returns (address token0, address token1, uint112 reserve0, uint112 reserve1)
    {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
        (reserve0, reserve1,) = pair.getReserves();
    }

    function getPair(address _token0, address _token1) external view returns (address) {
        return UniswapV2Factory.getPair(_token0, _token1);
    }
}
