// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IUniswapV3Pool {
    struct Slot0 {
        // the current price
        uint160 sqrtPriceX96;
        // the current tick
        int24 tick;
        // the most-recently updated index of the observations array
        uint16 observationIndex;
        // the current maximum number of observations that are being stored
        uint16 observationCardinality;
        // the next maximum number of observations to store, triggered in observations.write
        uint16 observationCardinalityNext;
        // the current protocol fee as a percentage of the swap fee taken on withdrawal
        // represented as an integer denominator (1/x)%
        uint8 feeProtocol;
        // whether the pool is locked
        bool unlocked;
    }

    function slot0() external view virtual returns (Slot0 memory);

    function fee() external view virtual returns (uint24 fee);

    function flash(address recipient, uint256 amount0, uint256 amount1, bytes memory data) external virtual;
}
