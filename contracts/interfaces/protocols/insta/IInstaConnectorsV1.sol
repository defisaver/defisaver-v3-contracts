// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IInstaConnectorsV1 {
    function enable(address _connector) external;
    function isConnector(address[] calldata _connectors) external view returns (bool isOk);
}
