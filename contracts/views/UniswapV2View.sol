// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { IUniswapV2Pair } from "../interfaces/uniswap/IUniswapV2Pair.sol";
import { IUniswapV2Factory } from "../interfaces/uniswap/IUniswapV2Factory.sol";

contract UniswapV2View {
    address constant public UNISWAP_V2_FACTORY_ADDR = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    IUniswapV2Factory constant public UniswapV2Factory = IUniswapV2Factory(UNISWAP_V2_FACTORY_ADDR);

    function getPairInfo(address _pair) external view returns (
        address token0,
        address token1,
        uint112 reserve0,
        uint112 reserve1
    ) {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
        (reserve0, reserve1, ) = pair.getReserves();
    }

    function getPair(address _token0, address _token1) external view returns (address) {
        return UniswapV2Factory.getPair(_token0, _token1);
    }
}