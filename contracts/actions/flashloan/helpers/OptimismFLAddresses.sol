// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

contract OptimismFLAddresses {

    address internal constant SOLO_MARGIN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant DYDX_FL_FEE_FAUCET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // this will stop MAKER flashloans on Optimism
    address internal constant DSS_FLASH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant ST_ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address internal constant DAI_ADDR = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;

    // AAVE_LENDING_POOL == AAVE_V3_LENDING_POOL so current automation doesn't break
    address internal constant AAVE_LENDING_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address internal constant AAVE_LENDING_POOL_ADDRESS_PROVIDER = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;

    address internal constant SPARK_LENDING_POOL_ADDRESS_PROVIDER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant SPARK_LENDING_POOL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant AAVE_V3_LENDING_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address internal constant AAVE_V3_LENDING_POOL_ADDRESS_PROVIDER = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;

    address internal constant VAULT_ADDR = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address internal constant GHO_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant GHO_FLASH_MINTER_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant UNI_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    address internal constant MORPHO_BLUE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address internal constant RECIPE_EXECUTOR_ADDR = 0xA532771BD90dAf94b456A4acC9E9cbBdF1367572;
}