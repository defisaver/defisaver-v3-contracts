// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;
import { AdminAuth } from "../../auth/AdminAuth.sol";

/// @title Handles authorization of who can call the execution of strategies
contract BotAuth is AdminAuth {
    mapping(address => bool) public approvedCallers;

    /// @notice Checks if the caller is approved for the specific subscription
    /// @dev First param is subId but it's not used in this implementation 
    /// @dev Currently auth callers are approved for all strategies
    /// @param _caller Address of the caller
    function isApproved(uint256, address _caller) public view returns (bool) {
        return approvedCallers[_caller];
    }

    /// @notice Adds a new bot address which will be able to call executeStrategy()
    /// @param _caller Bot address
    function addCaller(address _caller) public onlyOwner {
        approvedCallers[_caller] = true;
    }

    /// @notice Removes a bot address so it can't call executeStrategy()
    /// @param _caller Bot address
    function removeCaller(address _caller) public onlyOwner {
        approvedCallers[_caller] = false;
    }
}
