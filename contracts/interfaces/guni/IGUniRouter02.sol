// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.7.6;
pragma abicoder v2;

interface IGUniRouter02 {
    function removeLiquidity(
        address pool,
        uint256 burnAmount,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    )
        external
        returns (
            uint256 amount0,
            uint256 amount1,
            uint128 liquidityBurned
        );

    function rebalanceAndAddLiquidity(
        address pool,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amountSwap,
        bool zeroForOne,
        address[] memory swapActions,
        bytes[] memory swapDatas,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    )
        external
        returns (
            uint256 amount0,
            uint256 amount1,
            uint256 mintAmount
        );
    
    function addLiquidity(
        address pool,
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    )
        external
        returns (
            uint256 amount0,
            uint256 amount1,
            uint256 mintAmount
        );
}