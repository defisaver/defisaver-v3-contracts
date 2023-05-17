// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface ICurve3PoolZap {
    function add_liquidity(address, uint256[4] memory, uint256) external;
    function remove_liquidity(address, uint256, uint256[4] memory) external;
    function remove_liquidity_one_coin(address,uint256,int128,uint256) external;
    function remove_liquidity_imbalance(address, uint256[4] memory, uint256) external;
}