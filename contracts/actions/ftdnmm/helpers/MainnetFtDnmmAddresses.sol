// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title ftDNMM core addresses on Ethereum mainnet (chain id 1)
/// @dev ftDNMM is CREATE2-deployed with identical addresses on Sonic (146)
contract MainnetFtDnmmAddresses {
    address public constant POSITIONS_MANAGER = 0xbe4050a73a7Fb384c65E885a15C33461A4B20055;
    address public constant ACCOUNT_VALUES_ROUTER = 0x7aD77FddEf64Ec8325E8d2d02c2708AA2a412eF7;
    address public constant CONFIG_REGISTRY = 0xA8777c3D446fa7F0b0FC97a80C1Ea1d37F1ca33E;
}
