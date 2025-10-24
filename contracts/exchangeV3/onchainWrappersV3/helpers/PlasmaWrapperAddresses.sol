// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaWrapperAddresses {
    // address internal constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address payable internal constant WALLET_ID = payable(0x76720aC2574631530eC8163e4085d6F98513fb27);
    address internal constant UNI_V3_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V3_QUOTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // currently not set on base
    address internal constant CURVE_ADDRESS_PROVIDER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant CURVE_ROUTER_NG = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // not used on L2
    address internal constant KYBER_INTERFACE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V2_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
