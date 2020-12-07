// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../interfaces/IDFSRegistry.sol";
import "../utils/SafeERC20.sol";

/// @title AdminAuth Handles owner/admin priviligies over smart contracts
contract AdminAuth {
    using SafeERC20 for IERC20;

    address public owner;
    address public admin;

    modifier onlyOwner() {
        require(owner == msg.sender, "msg.sender not owner");
        _;
    }

    modifier onlyAdmin() {
        require(admin == msg.sender, "msg.sender not admin");
        _;
    }

    constructor() {
        owner = msg.sender;
        admin = 0x25eFA336886C74eA8E282ac466BdCd0199f85BB9;
    }

    /// @notice Admin is set by owner first time, after that admin is super role and has permission to change owner
    /// @param _admin Address of multisig that becomes admin
    function setAdmin(address _admin) public onlyOwner {
        require(admin == address(0), "admin is already set");

        admin = _admin;
    }

    /// @notice Admin is able to set new admin
    /// @param _admin Address of multisig that becomes new admin
    function changeAdmin(address _admin) public onlyAdmin {
        admin = _admin;
    }

    /// @notice Admin is able to change owner
    /// @param _owner Address of new owner
    function changeOwner(address _owner) public onlyAdmin {
        owner = _owner;
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
        selfdestruct(payable(owner));
    }
}
