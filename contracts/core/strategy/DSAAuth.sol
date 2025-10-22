// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IInstaAccountV2 } from "../../interfaces/insta/IInstaAccountV2.sol";
import { WalletAuth } from "./WalletAuth.sol";

/// @title DSAAuth Gets DSA Proxy Auth from users and is callable by StrategyExecutor
contract DSAAuth is WalletAuth {

    /// @dev Used for DSA Proxy Accounts connection to RecipeExecutor
    string private constant DEFISAVER_CONNECTOR_NAME = "DefiSaverConnector";

    /// @notice Calls the .cast() method of the specified users DSA Proxy
    /// @dev Contract gets the authority from the user to call it
    /// @dev Only callable by StrategyExecutor
    /// @dev Only callable when not paused
    /// @dev All calls will be forwarded to RecipeExecutor. See DefiSaverConnector.
    /// @param _dsaProxyAddr Address of the users DSA Proxy
    /// @param _callData Call data of the function to be called
    function callExecute(
        address _dsaProxyAddr,
        address /* _contractAddr */,
        bytes memory _callData
    ) public payable onlyExecutor notPaused {
        string[] memory connectors = new string[](1);
        connectors[0] = DEFISAVER_CONNECTOR_NAME;

        bytes[] memory connectorsData = new bytes[](1);
        connectorsData[0] = _callData;

        // Origin will only be used for event logging, so here we will set it to the StrategyExecutor
        address origin = msg.sender;

        IInstaAccountV2(_dsaProxyAddr).cast{value: msg.value}(connectors, connectorsData, origin);
    }
}