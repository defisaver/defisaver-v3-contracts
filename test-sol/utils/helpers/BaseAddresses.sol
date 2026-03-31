// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library Addresses {
    // Tokens
    address public constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address public constant DAI_ADDR = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
    address public constant USDC_ADDR = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant USDT_ADDR = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2; // Bridged USDT
    address internal constant WSTETH_ADDR = 0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WBTC_ADDR = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf; // This is cbBTC but for the sake of simplicity in tests we named it WBTC
    address public constant RENBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant BANNED_TOKEN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant YFI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant MKR_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LUSD_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LINK_ADDR = 0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196;
    address public constant AAVE_ADDR = 0x63706e401c06ac8513145b7687A14804d17f814b;
    address public constant GHO_TOKEN = 0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee;
    address public constant USDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant EUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant USDC_E_ADDR = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant USDbC_ADDR = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;

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
    address public constant COMET_USDC = 0xb125E6687d4313864e53df431d5425969c15Eb2F;
    address public constant SAFE_PROXY_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    address public constant SAFE_SINGLETON = 0x41675C099F32341bf84BFc5382aF534df5C7461a;
    address public constant UNISWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address public constant UNI_V2_WRAPPER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant UNI_V3_WRAPPER = 0x914A50910fF1404Fe62D04846a559c49C55219c3;
    address public constant INSTADAPP_INDEX = 0x6CE3e607C808b4f4C26B7F6aDAeB619e49CAbb25;
    address public constant INSTADAPP_CONNECTORS_V2 = 0x127d8cD0E2b2E0366D522DeA53A787bfE9002C14;
    address public constant INSTADAPP_MASTER_ACCOUNT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SF_PROXY_FACTORY = 0x881CD31218f45a75F8ad543A3e1Af087f3986Ae0;
    address public constant SF_PROXY_GUARD = 0x83c8BFfD11913f0e94C1C0B615fC2Fdb1B17A27e;

    // Fluid vaults
    address internal constant FLUID_VAULT_NOT_FOUND = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant FLUID_T1_VAULT_0 = 0xbEC491FeF7B4f666b270F9D5E5C3f443cBf20991; // wstETH/USDC
    address public constant FLUID_T1_VAULT_1 = FLUID_VAULT_NOT_FOUND; // wstETH/USDT not found
    address public constant FLUID_T1_VAULT_2 = FLUID_VAULT_NOT_FOUND; // WBTC/USDC not found
    address public constant FLUID_T1_VAULT_3 = FLUID_VAULT_NOT_FOUND; // wstETH/WBTC not found
    address public constant FLUID_T1_VAULT_4 = FLUID_VAULT_NOT_FOUND; // rsETH/wstETH not found
    address public constant FLUID_T1_VAULT_5 = 0x4045720a33193b4Fe66c94DFbc8D37B0b4D9B469; // cbBTC/USDC
    address public constant FLUID_T1_VAULT_6 = 0xeAbBfca72F8a8bf14C4ac59e69ECB2eB69F0811C; // ETH/USDC
    address public constant FLUID_T1_VAULT_7 = 0xA0F83Fc5885cEBc0420ce7C7b139Adc80c4F4D91; // wstETH/ETH
    address public constant FLUID_T2_VAULT_0 = FLUID_VAULT_NOT_FOUND; // WBTC-cbBTC/USDT not found
    address public constant FLUID_T2_VAULT_1 = 0xE6b5D1CdC4935295c84772C4700932b4BFC93274; // weETH-ETH/wstETH
    address public constant FLUID_T2_VAULT_2 = FLUID_VAULT_NOT_FOUND; // sUSDe-USDT/USDT not found
    address public constant FLUID_T3_VAULT_0 = FLUID_VAULT_NOT_FOUND; // ETH/USDC-USDT not found
    address public constant FLUID_T3_VAULT_1 = FLUID_VAULT_NOT_FOUND; // wstETH/USDC-USDT not found
    address public constant FLUID_T3_VAULT_2 = FLUID_VAULT_NOT_FOUND; // cbBTC/USDC-USDT not found
    address public constant FLUID_T4_VAULT_0 = 0x01c7c1c41dea58b043e700eFb23Dc077F12a125e; // wstETH-ETH/wstETH-ETH
    address public constant FLUID_T4_VAULT_1 = FLUID_VAULT_NOT_FOUND; // WBTC-cbBTC/WBTC-cbBTC not found
    address public constant FLUID_T4_VAULT_2 = FLUID_VAULT_NOT_FOUND; // sUSDe-USDT/USDC-USDT not found
    address public constant FLUID_T4_VAULT_3 = FLUID_VAULT_NOT_FOUND; // USDe-USDT/USDC-USDT not found
}
