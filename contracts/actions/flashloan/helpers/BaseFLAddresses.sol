// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract BaseFLAddresses {
    /**
     * DFS Addresses
     *
     */
    address internal constant DFS_REGISTRY_ADDR = 0x347FB634271F666353F23A3362f3935D96F97476;
    address internal constant FEE_FAUCET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * Token Addresses
     *
     */
    address internal constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address internal constant DAI_ADDR = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
    address internal constant ST_ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant GHO_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant CURVEUSD_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * External Addresses
     *
     */
    // Aave V2 -> Same as Aave V3 for backwards compatibility
    address internal constant AAVE_LENDING_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address internal constant AAVE_LENDING_POOL_ADDRESS_PROVIDER =
        0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D;
    // Aave V3
    address internal constant AAVE_V3_LENDING_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address internal constant AAVE_V3_LENDING_POOL_ADDRESS_PROVIDER =
        0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D;
    // Spark
    address internal constant SPARK_LENDING_POOL_ADDRESS_PROVIDER =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_LENDING_POOL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Maker
    address internal constant DSS_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Balancer V2
    address internal constant VAULT_ADDR = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    // Balancer V3
    address internal constant BALANCER_V3_VAULT_ADDR = 0xbA1333333333a1BA1108E8412f11850A5C319bA9;
    // GHO
    address internal constant GHO_FLASH_MINTER_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // Uniswap V3
    address internal constant UNI_V3_FACTORY = 0x33128a8fC17869897dcE68Ed026d694621f6FDfD;
    // Morpho Blue
    address internal constant MORPHO_BLUE_ADDR = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
    // Curve USD
    address internal constant CURVEUSD_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
