// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAdminVault } from "../interfaces/auth/IAdminVault.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { SafeERC20 } from "../_vendor/openzeppelin/SafeERC20.sol";
import { AuthHelper } from "./helpers/AuthHelper.sol";

/// @title AdminAuth Handles owner/admin privileges over smart contracts
contract AdminAuth is AuthHelper {
    using SafeERC20 for IERC20;

    IAdminVault public constant adminVault = IAdminVault(ADMIN_VAULT_ADDR);

    error SenderNotOwner();
    error SenderNotAdmin();

    modifier onlyOwner() {
        if (adminVault.owner() != msg.sender) {
            revert SenderNotOwner();
        }
        _;
    }

    modifier onlyAdmin() {
        if (adminVault.admin() != msg.sender) {
            revert SenderNotAdmin();
        }
        _;
    }

    /// @notice withdraw stuck funds
    function withdrawStuckFunds(address _token, address _receiver, uint256 _amount)
        public
        onlyOwner
    {
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            payable(_receiver).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_receiver, _amount);
        }
    }
}
