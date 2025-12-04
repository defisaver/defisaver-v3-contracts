// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Events } from "./events.sol";
import { Helpers } from "./helpers.sol";

/// @title DefiSaverResolver
/// @notice Common resolver for ConnectV2DefiSaver connectors
/// @notice Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
/// @dev Uses separate Events and Helpers contracts following instadapp connectors convention
abstract contract DefiSaverResolver is Events, Helpers {
    /// @notice Forward all calls to the RecipeExecutor
    /// @dev Does not emit events, but rather returns (eventName, data) to follow other connectors convention
    fallback(bytes calldata data) external payable returns (bytes memory) {
        (bool success,) = getRecipeExecutorAddress().delegatecall(data);
        if (!success) revert RecipeExecutionError();

        return abi.encode("LogConnectV2DefiSaver()", bytes(""));
    }

    /// @notice Returns the address of the RecipeExecutor for the connector
    /// @dev Must be implemented by the connector for each network
    function getRecipeExecutorAddress() public pure virtual returns (address);

    /// @notice Revert on plain ether transfer
    receive() external payable {
        revert();
    }
}
