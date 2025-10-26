// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DefiSaverConnector } from "../../../contracts/actions/insta/DefiSaverConnector.sol";
import { IInstaConnectorsV2 } from "../../../contracts/interfaces/protocols/insta/IInstaConnectorsV2.sol";
import { IInstaConnectorsV1 } from "../../../contracts/interfaces/protocols/insta/IInstaConnectorsV1.sol";
import { Addresses } from "../Addresses.sol";
import { CheatCodes } from "../CheatCodes.sol";
import { RegistryUtils } from "../RegistryUtils.sol";
import { DSAUtils } from "../../../contracts/utils/DSAUtils.sol";

contract DSAProxyTestUtils is CheatCodes, RegistryUtils {
    function _addDefiSaverConnector() internal {
        address defiSaverConnector = address(new DefiSaverConnector());
        redeploy("DefiSaverConnector", defiSaverConnector);
        cheats.label(defiSaverConnector, "DefiSaverConnector");

        address[] memory connectors = new address[](1);
        connectors[0] = defiSaverConnector;

        // Add connector for V1 DSA Proxy accounts
        {
            IInstaConnectorsV1 connector = IInstaConnectorsV1(Addresses.INSTADAPP_CONNECTORS_V1);

            if (connector.isConnector(connectors)) return;

            cheats.prank(Addresses.INSTADAPP_MASTER_ACCOUNT);
            connector.enable(defiSaverConnector);

            assert(connector.isConnector(connectors));
        }

        // Add connector for V2 DSA Proxy accounts
        {
            IInstaConnectorsV2 connector = IInstaConnectorsV2(Addresses.INSTADAPP_CONNECTORS_V2);

            string[] memory connectorNames = new string[](1);
            connectorNames[0] = DSAUtils.DEFISAVER_CONNECTOR_NAME;

            (bool alreadyAdded,) = connector.isConnectors(connectorNames);
            if (alreadyAdded) return;

            cheats.prank(Addresses.INSTADAPP_MASTER_ACCOUNT);
            connector.addConnectors(connectorNames, connectors);

            (bool isOk,) = connector.isConnectors(connectorNames);
            assert(isOk);
        }
    }
}
