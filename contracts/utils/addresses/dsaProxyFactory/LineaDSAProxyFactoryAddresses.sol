// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract LineaDSAProxyFactoryAddresses {
    /// @dev DSA Proxies are not supported on Linea. This is the mock factory which will always return 0 for `accountID` lookup.
    address internal constant DSA_LIST_ADDR = 0xF32d5d8D81f2662A02955CE537537088DF29daf5;
}
