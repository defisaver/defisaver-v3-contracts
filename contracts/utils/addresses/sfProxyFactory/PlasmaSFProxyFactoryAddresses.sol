// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaSFProxyFactoryAddresses {
    /// @dev SF Proxies are not supported on Linea. `_isSFProxy` lookup will always return false.
    address internal constant SF_PROXY_FACTORY_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SF_PROXY_GUARD = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    bytes32 internal constant SF_PROXY_CODEHASH = bytes32(0);
}
