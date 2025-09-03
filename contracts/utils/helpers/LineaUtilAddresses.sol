// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract LineaUtilAddresses {
    address internal refillCaller = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant FEE_RECIPIENT_ADDR = 0x2226836ec16FF5974dFD8DF740CD461B42FAffD5;
    address internal constant DEFAULT_BOT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant BOT_REGISTRY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant FEE_RECIPIENT = 0x2226836ec16FF5974dFD8DF740CD461B42FAffD5;
    address internal constant AAVE_MARKET = 0x89502c3731F69DDC95B65753708A07F8Cd0373F4;
    address internal constant AAVE_V3_MARKET = 0x89502c3731F69DDC95B65753708A07F8Cd0373F4;

    address internal constant UNI_V3_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // TODO: check
    address internal constant UNI_V3_QUOTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // TODO: check

    address internal constant DAI_ADDR = 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5;
    address internal constant WETH_ADDR = 0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f;
    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant MKR_PROXY_REGISTRY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // no DSProxy on Linea
    address internal constant DFS_PROXY_REGISTRY_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // no DSProxy on Linea

    // TODO: not needed now
    address internal constant FEE_RECEIVER_ADMIN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V2_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WSTETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_MARKET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant EETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WEETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; 
    address internal constant ETHER_FI_LIQUIDITY_POOL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant CHAINLINK_WBTC_ADDR = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB;

    address internal constant CHAINLINK_FEED_REGISTRY = 0x2D8BFD9FF88E3106ce7214621b0770c1578749A1;

    address internal constant TX_SAVER_FEE_RECIPIENT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}