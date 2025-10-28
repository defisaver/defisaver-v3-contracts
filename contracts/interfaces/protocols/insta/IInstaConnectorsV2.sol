// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IInstaConnectorsV2 {
    function addConnectors(string[] calldata _connectorNames, address[] calldata _connectors)
        external;
    function isConnectors(string[] calldata _connectorNames)
        external
        view
        returns (bool isOk, address[] memory _connectors);
}
