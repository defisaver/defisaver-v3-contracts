// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {
    ConnectV2DefiSaver
} from "../../../contracts/actions/insta/connectors/ConnectV2DefiSaver.sol";
import {
    IInstaConnectorsV2
} from "../../../contracts/interfaces/protocols/insta/IInstaConnectorsV2.sol";
import { Addresses } from "../Addresses.sol";
import { RegistryUtils } from "../RegistryUtils.sol";

contract DSAProxyTestUtils is RegistryUtils {
    function _addDefiSaverConnector() internal {
        address dfsConnector = address(new ConnectV2DefiSaver());
        redeploy("ConnectV2DefiSaver", dfsConnector);
        cheats.label(dfsConnector, "ConnectV2DefiSaver");

        address[] memory connectors = new address[](1);
        connectors[0] = dfsConnector;

        IInstaConnectorsV2 instaConnectorsV2 = IInstaConnectorsV2(Addresses.INSTADAPP_CONNECTORS_V2);

        string[] memory connectorNames = new string[](1);
        connectorNames[0] = "DEFI-SAVER-A";

        (bool alreadyAdded,) = instaConnectorsV2.isConnectors(connectorNames);
        if (alreadyAdded) return;

        cheats.prank(Addresses.INSTADAPP_MASTER_ACCOUNT);
        instaConnectorsV2.addConnectors(connectorNames, connectors);

        (bool isOk,) = instaConnectorsV2.isConnectors(connectorNames);
        assert(isOk);
    }
}
