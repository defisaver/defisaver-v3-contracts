// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { InstaConnectorHelper } from "./helpers/InstaConnectorHelper.sol";
import { IConnectorInterface } from "../../interfaces/protocols/insta/IConnectorInterface.sol";

/// @title DefiSaverConnector
/// @notice Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract DefiSaverConnector is AdminAuth, InstaConnectorHelper, IConnectorInterface {
    string public constant name = "DefiSaverConnector";

    /// @notice Forward all calls to the RecipeExecutor
    fallback() external payable {
        address executor = getDfsRecipeExecutor();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let succeeded := delegatecall(sub(gas(), 5000), executor, 0, calldatasize(), 0, 0)
            if iszero(succeeded) { revert(0, 0) }
        }
    }

    /// @notice Revert on plain ether transfer
    receive() external payable {
        revert();
    }
}
