// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library Addresses {
    // Tokens
    address public constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDR = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address public constant DAI_ADDR = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
    address public constant USDC_ADDR = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant USDT_ADDR = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    address internal constant WSTETH_ADDR = 0x5979D7b546E38E414F7E9822514be443A4800529;
    address internal constant STETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WBTC_ADDR = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f;
    address public constant RENBTC_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant BANNED_TOKEN_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant YFI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant MKR_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LUSD_ADDR = 0x93b346b6BC2548dA6A1E7d98E9a421B42541425b;
    address public constant LINK_ADDR = 0xf97f4df75117a78c1A5a0DBb814Af92458539FB4;
    address public constant AAVE_ADDR = 0xba5DdD1f9d7F570dc94a51479a000E3BCE967196;
    address public constant GHO_TOKEN = 0x7dfF72693f6A4149b17e7C6314655f6A9F7c8B33;
    address public constant USDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant EUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant SUSDE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant USDC_E = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;

    // DFS
    address public constant OWNER_ADDR = 0x926516E60521556F4ab5e7BF16A4d41a8539c7d1;
    address public constant FEE_RECEIVER = 0xe000e3c9428D539566259cCd89ed5fb85e655A01;
    address public constant DFS_REGISTRY = 0xBF1CaC12DB60819Bfa71A328282ecbc1D40443aA;
    address public constant OWNER_ACC = 0x926516E60521556F4ab5e7BF16A4d41a8539c7d1;
    address public constant ADMIN_ACC = 0x6AFEA85cFAB61e3a55Ad2e4537252Ec05796BEfa;
    address public constant WRAPPER_EXCHANGE_REGISTRY = 0x4a0c7BDF7F58AA04852Da07CDb3d367521f81446;
    address public constant LEGACY_RECIPE_EXECUTOR_ADDR_V3 =
        0xc1cB462033D8319016dF4e8A1810f1afB06b50bB;
    address public constant BUNDLE_ADDR = 0x8332F2a50A9a6C85a476e1ea33031681291cB694;
    address public constant STORAGE_ADDR = 0x6aeA695fcd0655650323e9dc5f80Ac0b15A91Da2;

    // EULER V2 (mainnet-only)
    address public constant E_WETH_2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant E_WSTETH_2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant E_USDC_2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // AAVE V3 stake tokens - Umbrella (mainnet-only; GHO exists on Arbitrum)
    address public constant STK_WETH_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant STK_USDC_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant STK_USDT_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant STK_GHO_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // Other
    address public constant DS_PROXY_FACTORY = 0x5a15566417e6C1c9546523066500bDDBc53F88C7;
    address public constant COMET_USDC = 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf; // This is USDC, not USDC_E
    address public constant SAFE_PROXY_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    address public constant SAFE_SINGLETON = 0x41675C099F32341bf84BFc5382aF534df5C7461a;
    address public constant UNISWAP_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24; // V3 -> 0xE592427A0AEce92De3Edee1F18E0157C05861564
    address public constant UNI_V2_WRAPPER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant UNI_V3_WRAPPER = 0x37236458C59F4dCF17b96Aa67FC07Bbf5578d873;
    // InstaDapp
    address public constant INSTADAPP_INDEX = 0x1eE00C305C51Ff3bE60162456A9B533C07cD9288;
    address public constant INSTADAPP_CONNECTORS_V2 = 0x67fCE99Dd6d8d659eea2a1ac1b8881c57eb6592B;
    address public constant INSTADAPP_MASTER_ACCOUNT = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Summerfi
    address public constant SF_PROXY_FACTORY = 0xCcB155E5B2A3201d5e10EdAa6e9F908871d1722B;
    address public constant SF_PROXY_GUARD = 0x746a6f9Acb42bcB43C08C829A035DBa7Db9E7385;
}
