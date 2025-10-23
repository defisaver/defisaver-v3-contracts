// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DefiSaverConnector } from "../../../contracts/actions/insta/DefiSaverConnector.sol";
import { IInstaConnectorsV2 } from "../../../contracts/interfaces/insta/IInstaConnectorsV2.sol";
import { Addresses } from "../Addresses.sol";
import { CheatCodes } from "../CheatCodes.sol";

contract DSAProxyUtils is CheatCodes {

    function _addDefiSaverConnector() internal {
        address defiSaverConnector = address(new DefiSaverConnector());
        cheats.label(defiSaverConnector, "DefiSaverConnector");

        IInstaConnectorsV2 connector = IInstaConnectorsV2(Addresses.INSTADAPP_CONNECTORS_V2);

        address[] memory connectors = new address[](1);
        connectors[0] = defiSaverConnector;

        string[] memory connectorNames = new string[](1);
        connectorNames[0] = 'DefiSaverConnector';

        cheats.prank(Addresses.INSTADAPP_MASTER_ACCOUNT);
        connector.addConnectors(connectorNames, connectors);

        (bool isOk, ) = connector.isConnectors(connectorNames);
        assert(isOk);
    }
}