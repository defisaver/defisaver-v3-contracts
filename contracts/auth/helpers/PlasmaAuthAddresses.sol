// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaAuthAddresses {
    address internal constant ADMIN_VAULT_ADDR = 0x6AB90ff536f0E2a880DbCdef1bB665C2acC0eDdC;
    address internal constant DSGUARD_FACTORY_ADDRESS = 0x71A9eF13C960c2F1Dd17962d3592A5bcdFaD6De0; // Mock contract without real newGuard functionality
    address internal constant ADMIN_ADDR = 0x7CF4F485e3a7fDa831e0579465881C51F3912A28; // USED IN ADMIN VAULT CONSTRUCTOR
    address internal constant PROXY_AUTH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Not needed now, waiting for automation
    address internal constant MODULE_AUTH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Not needed now, waiting for automation
    address internal constant DSA_AUTH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}