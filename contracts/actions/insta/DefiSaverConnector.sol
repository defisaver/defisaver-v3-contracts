// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { InstaConnectorHelper } from "./helpers/InstaConnectorHelper.sol";

/// @title DefiSaverConnector
/// @notice Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract DefiSaverConnector is AdminAuth, InstaConnectorHelper {
    /// @notice Name of the connector (different for each network)
    string public constant name = DEFISAVER_V2_CONNECTOR_NAME;

    /// @notice Error thrown if execution fails inside RecipeExecutor
    error RecipeExecutionError();

    /// @notice Forward all calls to the RecipeExecutor
    /// @dev Returns encoded event data to follow other connectors convention
    fallback(bytes calldata) external payable returns (bytes memory) {
        (bool success,) = getDfsRecipeExecutor().delegatecall(msg.data);
        if (!success) revert RecipeExecutionError();

        return abi.encode("LogConnectV2Defisaver()", bytes(""));
    }

    /// @notice Revert on plain ether transfer
    receive() external payable {
        revert();
    }
}
