// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract LineaActionsUtilAddresses {
    address internal constant DFS_REG_CONTROLLER_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // DSProxies not supported on Linea
    address internal constant SUB_STORAGE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Not needed now, waiting for automation
    address internal constant TRANSIENT_STORAGE = 0x425fA97285965E01Cc5F951B62A51F6CDEA5cc0d;
    address internal constant TRANSIENT_STORAGE_CANCUN = 0x425fA97285965E01Cc5F951B62A51F6CDEA5cc0d; // regular transient storage since no cancun support on Linea
    address internal constant REGISTRY_ADDR = 0x09fBeC68D216667C3262211D2E5609578951dCE0;
    address internal constant DFS_LOGGER_ADDR = 0x44e98bB58d725F2eF93a195F518b335dCB784c78;
    address internal constant PROXY_AUTH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Not needed now, waiting for automation

    // not yet implemented
    address internal constant LSV_PROXY_REGISTRY_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
