// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library Addresses {
    // Tokens
    address public constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address public constant DAI_ADDR = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
    address public constant USDC_ADDR = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
    address public constant USDT_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant WSTETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant RENBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant BANNED_TOKEN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant YFI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant MKR_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LUSD_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LINK_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant AAVE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant GHO_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant USDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant EUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant USDC_E = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // DFS
    address public constant OWNER_ADDR = 0xBaBe2409dBD359453E5292d684fF324A638801bF;
    address public constant FEE_RECEIVER = 0xEDFc68e2874B0AFc0963e18AE4D68522aEc7f97D;
    address public constant DFS_REGISTRY = 0x347FB634271F666353F23A3362f3935D96F97476;
    address public constant OWNER_ACC = 0xBaBe2409dBD359453E5292d684fF324A638801bF;
    address public constant ADMIN_ACC = 0xF8EC1967A719027A95883a89579e7A77699899e4;
    address public constant WRAPPER_EXCHANGE_REGISTRY = 0x586328A3F24E2c1A41D9A3a5B2Ed123A156dB82e;
    address public constant LEGACY_RECIPE_EXECUTOR_ADDR_V3 =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant BUNDLE_ADDR = 0x6AB90ff536f0E2a880DbCdef1bB665C2acC0eDdC;
    address public constant STORAGE_ADDR = 0x3Ca96CebC7779Ee86685c67c999d0f03158Ee9cA;
    address public constant TRANSIENT_STORAGE_CANCUN = 0x1E44a7ec82432419D5876c4c737f966fdDf2dD5C;

    // Euler V2
    address public constant E_WETH_2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant E_WSTETH_2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant E_USDC_2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // Aave V3 stake tokens - Umbrella
    address public constant STK_WETH_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant STK_USDC_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant STK_USDT_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant STK_GHO_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // Other
    address public constant DS_PROXY_FACTORY = 0x425fA97285965E01Cc5F951B62A51F6CDEA5cc0d;
    address public constant COMET_USDC = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SAFE_PROXY_FACTORY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SAFE_SINGLETON = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant UNISWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address public constant UNI_V2_WRAPPER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant UNI_V3_WRAPPER = 0x914A50910fF1404Fe62D04846a559c49C55219c3;
    address public constant INSTADAPP_INDEX = 0x6CE3e607C808b4f4C26B7F6aDAeB619e49CAbb25;
    address public constant INSTADAPP_CONNECTORS_V2 = 0x127d8cD0E2b2E0366D522DeA53A787bfE9002C14;
    address public constant INSTADAPP_MASTER_ACCOUNT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SF_PROXY_FACTORY = 0x881CD31218f45a75F8ad543A3e1Af087f3986Ae0;
    address public constant SF_PROXY_GUARD = 0x83c8BFfD11913f0e94C1C0B615fC2Fdb1B17A27e;
}
