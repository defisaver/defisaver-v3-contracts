// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IConnectorInterface {
    function name() external view returns (string memory);
    // Only used for V1 DSA Proxy accounts
    function connectorID() external view returns(uint256 _type, uint256 _id);
}