// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../interfaces/IDFSRegistry.sol";
import "../utils/SafeERC20.sol";

import "./AdminVault.sol";

/// @title AdminAuth Handles owner/admin priviligies over smart contracts
contract AdminAuth {
    using SafeERC20 for IERC20;

    AdminVault public adminVault = AdminVault(0xCCf3d848e08b94478Ed8f46fFead3008faF581fD);

    modifier onlyOwner() {
        require(adminVault.owner() == msg.sender, "msg.sender not owner");
        _;
    }

    modifier onlyAdmin() {
        require(adminVault.admin() == msg.sender, "msg.sender not admin");
        _;
    }

    /// @notice  withdraw stuck funds
    function withdrawStuckFunds(address _token, address _receiver, uint256 _amount) public onlyOwner {
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            payable(_receiver).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_receiver, _amount);
        }
    }

    /// @notice Destroy the contract
    function kill() public onlyAdmin {
        selfdestruct(payable(msg.sender));
    }

    /// @notice Changes the admin vault that is currently used
    /// @param _newAdminVault Address of the new Admin Vault contract
    function changeAdminVault(address _newAdminVault) public onlyAdmin {
        adminVault = AdminVault(_newAdminVault);
    }
}
