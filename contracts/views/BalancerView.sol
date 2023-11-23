// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

pragma experimental ABIEncoderV2;

import "../interfaces/balancer/IPool.sol";
import "../interfaces/balancer/IVault.sol";

contract BalancerView {
    
    function getPoolTokens(address _pool) external view returns (
        address[] memory tokens,
        uint256[] memory balances
    ) {
        bytes32 poolId = IPool(_pool).getPoolId();
        (tokens, balances, ) = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8).getPoolTokens(poolId); 
    }
}