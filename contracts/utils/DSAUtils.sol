// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IInstaAccount } from "../interfaces/protocols/insta/IInstaAccount.sol";
import { IInstaAccountV1 } from "../interfaces/protocols/insta/IInstaAccountV1.sol";
import { IInstaAccountV2 } from "../interfaces/protocols/insta/IInstaAccountV2.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "./DFSIds.sol";

/// @title DSAUtils - Helper library for DSA Proxy Accounts
library DSAUtils {
    /// @dev Used for DSA Proxy V2 Accounts
    string public constant DEFISAVER_CONNECTOR_NAME = "DefiSaverConnector";

    /// @dev Used for DSA Proxy Accounts versioning
    uint256 private constant DSA_VERSION_1 = 1;

    /// @notice Call the cast function of the DSA Proxy
    /// @dev Handles both V1 and V2 versions of the DSA Proxy
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
        // V1 and V2 versions have different interfaces, so we support both.
        uint256 version = IInstaAccount(_dsaProxy).version();

        // Init execution data
        bytes[] memory connectorsData = new bytes[](1);
        connectorsData[0] = _data;

        // For V1 version, we are calling connector directly
        if (version == DSA_VERSION_1) {
            address[] memory targets = new address[](1);
            targets[0] = IDFSRegistry(_dfsRegistry).getAddr(DFSIds.DEFISAVER_CONNECTOR);

            IInstaAccountV1(_dsaProxy).cast{ value: _value }(targets, connectorsData, _eventOrigin);
            return;
        }

        // If not DSA_VERSION_1, we are working with V2 version

        // We hardcode the connector to save gas from two external calls:
        // 1. Fetching the connector address from the DFS Registry
        // 2. Reading the connector name
        string[] memory connectors = new string[](1);
        connectors[0] = DEFISAVER_CONNECTOR_NAME;

        IInstaAccountV2(_dsaProxy).cast{ value: _value }(connectors, connectorsData, _eventOrigin);
    }
}
