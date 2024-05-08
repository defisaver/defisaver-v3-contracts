// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Handles authorization of who can call the tx relay
contract BotAuthForTxRelay is AdminAuth {
    mapping(address => bool) public approvedCallers;

    /// @notice Checks if the caller is approved
    /// @param _caller Address of the caller
    function isApproved(address _caller) public view returns (bool) {
        return approvedCallers[_caller];
    }

    /// @notice Adds a new bot address which will be able to call tx relay executor
    /// @param _caller Bot address
    function addCaller(address _caller) public onlyOwner {
        approvedCallers[_caller] = true;
    }

    /// @notice Removes a bot address so it can't call tx relay executor
    /// @param _caller Bot address
    function removeCaller(address _caller) public onlyOwner {
        approvedCallers[_caller] = false;
    }
}
