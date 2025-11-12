// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IInstaAccount } from "../interfaces/protocols/insta/IInstaAccount.sol";
import { IInstaAccountV2 } from "../interfaces/protocols/insta/IInstaAccountV2.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "./DFSIds.sol";

/// @title DSAUtils - Helper library for DSA Proxy Accounts
library DSAUtils {
    /// @dev Used for DSA Proxy V2 Accounts
    string public constant DEFISAVER_CONNECTOR_NAME = "DefiSaverConnector";

    /// @notice Call the cast function of the DSA Proxy
    /// @param _dsaProxy Address of the DSA Proxy
    /// @param _dfsRegistry Address of the DFS Registry
    /// @param _eventOrigin Address of the event origin
    /// @param _data Call data
    /// @param _value Value to send with the call
    function cast(
        address _dsaProxy,
        address _dfsRegistry,
        address _eventOrigin,
        bytes memory _data,
        uint256 _value
    ) internal {
        // Init execution data
        bytes[] memory connectorsData = new bytes[](1);
        connectorsData[0] = _data;

        // We hardcode the connector to save gas from two external calls:
        // 1. Fetching the connector address from the DFS Registry
        // 2. Reading the connector name
        string[] memory connectors = new string[](1);
        connectors[0] = DEFISAVER_CONNECTOR_NAME;

        IInstaAccountV2(_dsaProxy).cast{ value: _value }(connectors, connectorsData, _eventOrigin);
    }
}
