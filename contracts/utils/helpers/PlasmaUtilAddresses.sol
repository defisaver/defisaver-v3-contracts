// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaUtilAddresses {
    address internal refillCaller = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant FEE_RECIPIENT_ADDR = 0x2226836ec16FF5974dFD8DF740CD461B42FAffD5; // TODO:P
    address internal constant DEFAULT_BOT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant BOT_REGISTRY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant FEE_RECIPIENT = 0x2226836ec16FF5974dFD8DF740CD461B42FAffD5; // TODO:P
    address internal constant AAVE_MARKET = 0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9; 
    address internal constant AAVE_V3_MARKET = 0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9;

    address internal constant UNI_V3_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V3_QUOTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant DAI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // TODO: double check if DAI will be live
    address internal constant WETH_ADDR = 0x9895D81bB462A195b4922ED7De0e3ACD007c32CB;
    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant MKR_PROXY_REGISTRY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // no DSProxy on Linea
    address internal constant DFS_PROXY_REGISTRY_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // no DSProxy on Linea

    address internal constant FEE_RECEIVER_ADMIN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V2_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WSTETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_MARKET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant EETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WEETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; 
    address internal constant ETHER_FI_LIQUIDITY_POOL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant CHAINLINK_WBTC_ADDR = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB; // TODO:P

    address internal constant CHAINLINK_FEED_REGISTRY = 0x2D8BFD9FF88E3106ce7214621b0770c1578749A1; // TODO:P

    address internal constant TX_SAVER_FEE_RECIPIENT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}