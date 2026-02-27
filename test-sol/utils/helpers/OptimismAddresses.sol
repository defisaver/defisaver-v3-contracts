// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library Addresses {
    // Tokens
    address public constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address public constant DAI_ADDR = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
    address public constant USDC_ADDR = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address public constant USDT_ADDR = 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58;
    address internal constant WSTETH_ADDR = 0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WBTC_ADDR = 0x68f180fcCe6836688e9084f035309E29Bf0A2095;
    address public constant RENBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant BANNED_TOKEN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant YFI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant MKR_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LUSD_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LINK_ADDR = 0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6;
    address public constant AAVE_ADDR = 0x76FB31fb4af56892A25e32cFC43De717950c9278;
    address public constant GHO_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant USDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant EUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant USDC_E = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // DFS
    address public constant OWNER_ADDR = 0xC9a956923bfb5F141F1cd4467126b3ae91E5CC33;
    address public constant FEE_RECEIVER = 0x5b12C2B979CB3aB89DD4813837873bC4Dd1930D0;
    address public constant DFS_REGISTRY = 0xAf707Ee480204Ed6e2640B53cE86F680D28Afcbd;
    address public constant OWNER_ACC = 0xC9a956923bfb5F141F1cd4467126b3ae91E5CC33;
    address public constant ADMIN_ACC = 0x98118fD1Da4b3369AEe87778168e97044980632F;
    address public constant WRAPPER_EXCHANGE_REGISTRY = 0x82b039Ca3c16E971132603f960a6E98582d8F021;
    address public constant LEGACY_RECIPE_EXECUTOR_ADDR_V3 =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant BUNDLE_ADDR = 0xc98C5312829006b2D4bBd47162d49B1aa6C275Ab;
    address public constant STORAGE_ADDR = 0xDdDE69c3Fd246D9D62f9712c814b333728f113A4;

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
    address public constant DS_PROXY_FACTORY = 0x283Cc5C26e53D66ed2Ea252D986F094B37E6e895;
    address public constant COMET_USDC = 0x2e44e174f7D53F0212823acC11C01A11d58c5bCB;
    address public constant SAFE_PROXY_FACTORY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SAFE_SINGLETON = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant UNISWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant UNI_V2_WRAPPER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant UNI_V3_WRAPPER = 0xF723B39fe2Aa9102dE45Bc8ECd3417805aAC79Aa;
    address public constant INSTADAPP_INDEX = 0x6CE3e607C808b4f4C26B7F6aDAeB619e49CAbb25;
    address public constant INSTADAPP_CONNECTORS_V2 = 0x127d8cD0E2b2E0366D522DeA53A787bfE9002C14;
    address public constant INSTADAPP_MASTER_ACCOUNT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SF_PROXY_FACTORY = 0xaaf64927BaFe68E389DE3627AA6b52D81bdA2323;
    address public constant SF_PROXY_GUARD = 0x916411367fC2f0dc828790eA03CF317eC74E24E4;
}
