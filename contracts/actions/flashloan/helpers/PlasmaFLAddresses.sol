// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaFLAddresses {
    /**
     * DFS Addresses
     *
     */
    address internal constant DFS_REGISTRY_ADDR = 0x44e98bB58d725F2eF93a195F518b335dCB784c78;
    address internal constant FEE_FAUCET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * Token Addresses
     *
     */
    address internal constant WETH_ADDR = 0x6100E367285b01F48D07953803A2d8dCA5D19873;
    address internal constant DAI_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant ST_ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant GHO_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant CURVEUSD_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * External Addresses
     *
     */
    // Aave V2 -> Same as Aave V3 for backwards compatibility
    address internal constant AAVE_LENDING_POOL = 0x925a2A7214Ed92428B5b1B090F80b25700095e12;
    address internal constant AAVE_LENDING_POOL_ADDRESS_PROVIDER =
        0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9;
    // Aave V3
    address internal constant AAVE_V3_LENDING_POOL = 0x925a2A7214Ed92428B5b1B090F80b25700095e12;
    address internal constant AAVE_V3_LENDING_POOL_ADDRESS_PROVIDER =
        0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9;
    // Spark
    address internal constant SPARK_LENDING_POOL_ADDRESS_PROVIDER =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_LENDING_POOL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Maker
    address internal constant DSS_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Balancer V2
    address internal constant VAULT_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Balancer V3
    address internal constant BALANCER_V3_VAULT_ADDR = 0xbA1333333333a1BA1108E8412f11850A5C319bA9;
    // GHO
    address internal constant GHO_FLASH_MINTER_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Uniswap V3
    address internal constant UNI_V3_FACTORY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Morpho Blue
    address internal constant MORPHO_BLUE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Curve USD
    address internal constant CURVEUSD_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
