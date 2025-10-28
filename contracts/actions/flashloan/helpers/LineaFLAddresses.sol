// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract LineaFLAddresses {
    address internal constant WETH_ADDR = 0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f;
    address internal constant DAI_ADDR = 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5;

    // AAVE_LENDING_POOL == AAVE_V3_LENDING_POOL so current automation doesn't break
    address internal constant AAVE_LENDING_POOL = 0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac;
    address internal constant AAVE_LENDING_POOL_ADDRESS_PROVIDER =
        0x89502c3731F69DDC95B65753708A07F8Cd0373F4;
    address internal constant AAVE_V3_LENDING_POOL = 0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac;
    address internal constant AAVE_V3_LENDING_POOL_ADDRESS_PROVIDER =
        0x89502c3731F69DDC95B65753708A07F8Cd0373F4;

    address internal constant RECIPE_EXECUTOR_ADDR = 0x50bCFC115283dF48Ab6382551B9B93b08E197747;

    ////////// NOT USED
    address internal constant VAULT_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant BALANCER_V3_VAULT_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant MORPHO_BLUE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant UNI_V3_FACTORY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant SOLO_MARGIN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant DYDX_FL_FEE_FAUCET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // this will stop MAKER flashloans on Optimism
    address internal constant DSS_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant ST_ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant SPARK_LENDING_POOL_ADDRESS_PROVIDER =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_LENDING_POOL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant GHO_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant GHO_FLASH_MINTER_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant CURVEUSD_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant CURVEUSD_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
