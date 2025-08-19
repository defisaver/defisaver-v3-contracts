// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library Addresses {

    /*//////////////////////////////////////////////////////////////
                                TOKENS
    //////////////////////////////////////////////////////////////*/
    address public constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDC_ADDR = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT_ADDR = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address internal constant WSTETH_ADDR = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
    address internal constant STETH_ADDR = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address public constant WBTC_ADDR = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address public constant RENBTC_ADDR = 0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D;
    address public constant BANNED_TOKEN_ADDR = 0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39;
    address public constant YFI_ADDR = 0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e;
    address public constant MKR_ADDR = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2;
    address public constant OWNER_ADDR = 0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00;
    address public constant COMET_USDC = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;
    address public constant UNI_V2_WRAPPER = 0x6cb48F0525997c2C1594c89e0Ca74716C99E3d54;
    address public constant FEE_RECEIVER = 0x6467e807dB1E71B9Ef04E0E3aFb962E4B0900B2B;
    address public constant LUSD_ADDR = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
    address public constant LINK_ADDR = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address public constant AAVE_ADDR = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;
    address public constant GHO_TOKEN = 0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f;
    address public constant USDE_ADDR = 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3;
    address public constant EUSDE_ADDR = 0x90D2af7d622ca3141efA4d8f1F24d86E5974Cc8F;
    address public constant SUSDE_ADDR = 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497;
    // EULER V2
    address public constant E_WETH_2 = 0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2;
    address public constant E_WSTETH_2 = 0xbC4B4AC47582c3E38Ce5940B80Da65401F4628f1;
    address public constant E_USDC_2 = 0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9;
    // AAVE V3 stake tokens - Umbrella
    address public constant STK_WETH_TOKEN = 0xaAFD07D53A7365D3e9fb6F3a3B09EC19676B73Ce;
    address public constant STK_USDC_TOKEN = 0x6bf183243FdD1e306ad2C4450BC7dcf6f0bf8Aa6;
    address public constant STK_USDT_TOKEN = 0xA484Ab92fe32B143AEE7019fC1502b1dAA522D31;
    address public constant STK_GHO_TOKEN = 0x4f827A63755855cDf3e8f3bcD20265C833f15033;

    /*//////////////////////////////////////////////////////////////
                                OTHER
    //////////////////////////////////////////////////////////////*/
    address public constant OWNER_ACC = 0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00;
    address public constant ADMIN_ACC = 0x25eFA336886C74eA8E282ac466BdCd0199f85BB9;
    address public constant WRAPPER_EXCHANGE_REGISTRY = 0x653893375dD1D942D2C429caB51641F2bf14d426;
    address public constant DS_PROXY_FACTORY = 0xA26e15C895EFc0616177B7c1e7270A4C7D51C997;
    address public constant SAFE_PROXY_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    address public constant SAFE_SINGLETON = 0x41675C099F32341bf84BFc5382aF534df5C7461a;
    address public constant LEGACY_RECIPE_EXECUTOR_ADDR_V3 = 0x1D6DEdb49AF91A11B5C5F34954FD3E8cC4f03A86;
    address public constant UNISWAP_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant BUNDLE_ADDR = 0x223c6aDE533851Df03219f6E3D8B763Bd47f84cf;
    address public constant STORAGE_ADDR = 0xF52551F95ec4A2B4299DcC42fbbc576718Dbf933;
}