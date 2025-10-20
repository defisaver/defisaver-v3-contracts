// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {AdminAuth} from "../../auth/AdminAuth.sol";
import {InstaConnectorHelper} from "./helpers/InstaConnectorHelper.sol";
import {IConnectorInterface} from "../../interfaces/insta/IConnectorInterface.sol";
import {console} from "hardhat/console.sol";

/// @title DefiSaverConnector
/// @notice Forward all calls to the RecipeExecutor via delegatecall in context of DSA accounts
contract DefiSaverConnector is AdminAuth, InstaConnectorHelper, IConnectorInterface {

    /// @notice Forward all calls to the RecipeExecutor
    // solhint-disable no-complex-fallback
    fallback() external payable {
        console.log("fallback called");
        address executor = getDfsRecipeExecutor();
        console.log("executor", executor);
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

    /// @notice Revert on plain ether transfer
    // solhint-disable reason-string
    // solhint-disable gas-custom-errors
    receive() external payable {
        revert();
    }
}
