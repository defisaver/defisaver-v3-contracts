// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { WalletAuth } from "./WalletAuth.sol";
import { DSAUtils } from "../../utils/DSAUtils.sol";

/// @title DSAAuth Gets DSA Proxy Auth from users and is callable by StrategyExecutor
contract DSAAuth is WalletAuth {
    /// @notice Calls the .cast() method of the specified users DSA Proxy
    /// @dev Contract gets the authority from the user to call it
    /// @dev Only callable by StrategyExecutor
    /// @dev Only callable when not paused
    /// @dev All calls will be forwarded to RecipeExecutor. See DefiSaverConnector.
    /// @param _dsaProxyAddr Address of the users DSA Proxy
    /// @param _callData Call data of the function to be called
    function callExecute(
        address _dsaProxyAddr,
        address,
        /* _contractAddr */
        bytes memory _callData
    )
        public
        payable
        onlyExecutor
        notPaused
    {
        DSAUtils.cast(
            _dsaProxyAddr,
            REGISTRY_ADDR,
            msg.sender, // Only used for event logging, so here we will set it to the StrategyExecutor
            _callData,
            msg.value
        );
    }
}
