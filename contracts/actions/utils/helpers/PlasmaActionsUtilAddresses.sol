// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract PlasmaActionsUtilAddresses {
    address internal constant DFS_REG_CONTROLLER_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // DSProxies not supported on Linea
    address internal constant SUB_STORAGE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Not needed now, waiting for automation
    address internal constant TRANSIENT_STORAGE = 0x291EAc3cA14b7FcA8a93af4f6198E76FcFc6B0cD;
    address internal constant TRANSIENT_STORAGE_CANCUN = 0xa793DaA424d731Bf597eA3A46a16aFA283D80ea7;
    address internal constant REGISTRY_ADDR = 0x44e98bB58d725F2eF93a195F518b335dCB784c78;
    address internal constant DFS_LOGGER_ADDR = 0x02a516861f41262F22617511d00B6FCcAb65f762;
    address internal constant PROXY_AUTH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Not needed now, waiting for automation

    // not yet implemented
    address internal constant LSV_PROXY_REGISTRY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
