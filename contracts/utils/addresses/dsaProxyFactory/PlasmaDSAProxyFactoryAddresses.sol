// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaDSAProxyFactoryAddresses {
    /// @dev DSA Proxies are not supported on Linea. This is the mock factory which will always return 0 for `accountID` lookup.
    address internal constant DSA_LIST_ADDR = 0x1bA6082D2ef1aB92a55B96264c72Eb8049C964Ce;
}
