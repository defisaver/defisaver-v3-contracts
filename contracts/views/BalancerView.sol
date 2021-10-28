// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

pragma experimental ABIEncoderV2;

import "../actions/balancer/helpers/BalancerV2Helper.sol";
import "../interfaces/balancer/IPool.sol";

contract BalancerView is BalancerV2Helper {
    function getPoolTokens(address _pool) external view returns (
        address[] memory tokens,
        uint256[] memory balances
    ) {
        bytes32 poolId = IPool(_pool).getPoolId();
        (tokens, balances, ) = vault.getPoolTokens(poolId); 
    }
}