// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DefiSaverConnector } from "../../../contracts/actions/insta/DefiSaverConnector.sol";
import {
    IInstaConnectorsV2
} from "../../../contracts/interfaces/protocols/insta/IInstaConnectorsV2.sol";
import { Addresses } from "../Addresses.sol";
import { CheatCodes } from "../CheatCodes.sol";
import { RegistryUtils } from "../RegistryUtils.sol";

contract DSAProxyTestUtils is CheatCodes, RegistryUtils {
    function _addDefiSaverConnector() internal {
        address defiSaverConnector = address(new DefiSaverConnector());
        redeploy("DefiSaverConnector", defiSaverConnector);
        cheats.label(defiSaverConnector, "DefiSaverConnector");

        address[] memory connectors = new address[](1);
        connectors[0] = defiSaverConnector;

        IInstaConnectorsV2 connector = IInstaConnectorsV2(Addresses.INSTADAPP_CONNECTORS_V2);

        string[] memory connectorNames = new string[](1);
        connectorNames[0] = "DEFI-SAVER-A";

        (bool alreadyAdded,) = connector.isConnectors(connectorNames);
        if (alreadyAdded) return;

        cheats.prank(Addresses.INSTADAPP_MASTER_ACCOUNT);
        connector.addConnectors(connectorNames, connectors);

        (bool isOk,) = connector.isConnectors(connectorNames);
        assert(isOk);
    }
}
