// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDSProxy } from "../../interfaces/IDSProxy.sol";
import { WalletAuth } from "./WalletAuth.sol";

/// @title ProxyAuth Gets DSProxy auth from users and is callable by StrategyExecutor
/// @notice Current version does not support pausing because of backwards compatibility
contract ProxyAuth is WalletAuth {

    /// @notice Calls the .execute() method of the specified users DSProxy
    /// @dev Contract gets the authority from the user to call it
    /// @dev Only callable by StrategyExecutor
    /// @param _proxyAddr Address of the users DSProxy
    /// @param _contractAddr Address of the contract which to execute
    /// @param _callData Call data of the function to be called
    function callExecute(address _proxyAddr, address _contractAddr, bytes memory _callData)
        public
        payable
        onlyExecutor
    {
        IDSProxy(_proxyAddr).execute{ value: msg.value }(_contractAddr, _callData);
    }
}
