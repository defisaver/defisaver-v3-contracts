// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract LineaDSAProxyFactoryAddresses {
    // No DSA support on linea. This is mock deployment that will always return 0 for dsa address lookup.
    address internal constant DSA_LIST_ADDR = 0xF32d5d8D81f2662A02955CE537537088DF29daf5;
}
