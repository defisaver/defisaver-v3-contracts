// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaFLAddresses {
    address internal constant WETH_ADDR = 0x6100E367285b01F48D07953803A2d8dCA5D19873;

    // AAVE_LENDING_POOL == AAVE_V3_LENDING_POOL so current automation doesn't break
    address internal constant AAVE_LENDING_POOL = 0x925a2A7214Ed92428B5b1B090F80b25700095e12;
    address internal constant AAVE_LENDING_POOL_ADDRESS_PROVIDER =
        0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9;
    address internal constant AAVE_V3_LENDING_POOL = 0x925a2A7214Ed92428B5b1B090F80b25700095e12;
    address internal constant AAVE_V3_LENDING_POOL_ADDRESS_PROVIDER =
        0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9;

    address internal constant RECIPE_EXECUTOR_ADDR = 0xB8af168883D049FF9C811ab5B5DE179f3e7d6Fb7;

    ////////// NOT USED
    address internal constant DAI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // No deployment on Plasma
    address internal constant VAULT_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant BALANCER_V3_VAULT_ADDR = 0xbA1333333333a1BA1108E8412f11850A5C319bA9;
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
