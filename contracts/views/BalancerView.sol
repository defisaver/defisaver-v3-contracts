// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IPool } from "../interfaces/balancer/IPool.sol";
import { IVault } from "../interfaces/balancer/IVault.sol";

contract BalancerView {
    
    function getPoolTokens(address _pool) external view returns (
        address[] memory tokens,
        uint256[] memory balances
    ) {
        bytes32 poolId = IPool(_pool).getPoolId();
        (tokens, balances, ) = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8).getPoolTokens(poolId); 
    }
}