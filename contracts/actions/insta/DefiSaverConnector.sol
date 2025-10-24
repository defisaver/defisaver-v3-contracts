// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {AdminAuth} from "../../auth/AdminAuth.sol";
import {InstaConnectorHelper} from "./helpers/InstaConnectorHelper.sol";
import {IConnectorInterface} from "../../interfaces/insta/IConnectorInterface.sol";

/// @title DefiSaverConnector
/// @notice Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract DefiSaverConnector is AdminAuth, InstaConnectorHelper, IConnectorInterface {

    /// @notice Forward all calls to the RecipeExecutor
    // solhint-disable no-complex-fallback
    fallback() external payable {
        address executor = getDfsRecipeExecutor();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let succeeded := delegatecall(sub(gas(), 5000), executor, 0, calldatasize(), 0, 0)
            if iszero(succeeded) {
                revert(0, 0)
            }
        }
    }

    /// @notice Return the name of the connector
    function name() external override pure returns (string memory) {
        return "DefiSaverConnector";
    }

    /// @notice Returns the ID of the connector
    /// @dev Only used for V1 DSA Proxy accounts
    /// @return _type Type of the connector. Unused, always returned as 1
    /// @return _id ID of the connector, representing (totalConnectors + 1) at the time this connector was added
    function connectorID() external override pure returns (uint256 _type, uint256 _id) {
        return (1, 103);
    }

    /// @notice Revert on plain ether transfer
    // solhint-disable reason-string
    // solhint-disable gas-custom-errors
    receive() external payable {
        revert();
    }
}
