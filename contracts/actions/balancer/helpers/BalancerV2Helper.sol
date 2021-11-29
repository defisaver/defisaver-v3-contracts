// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../interfaces/balancer/IVault.sol";
import "./MainnetBalancerV2Addresses.sol";

/// @title Utility functions and data used in Balancer actions
contract BalancerV2Helper is MainnetBalancerV2Addresses{
    IVault public constant vault = IVault(VAULT_ADDR);
    string public constant ADDR_MUST_NOT_BE_ZERO = "Address to which tokens will be sent to can't be burn address";

    function _getPoolAddress(bytes32 poolId) internal pure returns (address) {
        // 12 byte logical shift left to remove the nonce and specialization setting. We don't need to mask,
        // since the logical shift already sets the upper bits to zero.
        return address(uint160(uint256(poolId) >> (12 * 8)));
    }
}