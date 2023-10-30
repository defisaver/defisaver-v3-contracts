// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

contract BaseUtilAddresses {
    address internal refillCaller = 0xBefc466abe547B1785f382883833330a47C573f7;
    address internal feeAddr = 0x76720aC2574631530eC8163e4085d6F98513fb27;
    address internal constant DEFAULT_BOT = 0x061DEa0E92ed3D2DE743791746373B14c3Ec123E;
    address internal constant BOT_REGISTRY_ADDRESS = 0xa2ABA81e65543d18dd1a1E4A31Bc41C4a86453cf;
    address internal constant FEE_RECIPIENT = 0xEDFc68e2874B0AFc0963e18AE4D68522aEc7f97D;
    address internal constant AAVE_MARKET = 0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D;


    address internal constant UNI_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address internal constant UNI_V3_QUOTER = 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a;

    address internal constant DAI_ADDR = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
    address internal constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant MKR_PROXY_REGISTRY = 0x425fA97285965E01Cc5F951B62A51F6CDEA5cc0d;
    address internal constant PROXY_FACTORY_ADDR = 0x291EAc3cA14b7FcA8a93af4f6198E76FcFc6B0cD;
    address internal constant DFS_PROXY_REGISTRY_ADDR = 0x2D8BFD9FF88E3106ce7214621b0770c1578749A1;

    // TODO: not needed now
    address internal constant FEE_RECEIVER_ADMIN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V2_ROUTER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WSTETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant AAVE_V3_MARKET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_MARKET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant CHAINLINK_WBTC_ADDR = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB;

    address internal constant CHAINLINK_FEED_REGISTRY = 0x7dFF34190d0307fC234fc7E8C152C9715083eB02;
}