// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../utils/SafeERC20.sol";

contract AdminAuth {

    using SafeERC20 for IERC20;

    address public owner;
    address public admin;

    modifier onlyOwner() {
        require(owner == msg.sender, "msg.sender not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Admin is set by owner first time, after that admin is super role and has permission to change owner
    /// @param _admin Address of multisig that becomes admin
    function setAdminByOwner(address _admin) public {
        require(msg.sender == owner, "msg.sender not owner");
        require(admin == address(0), "admin is already set");

        admin = _admin;
    }

    /// @notice Admin is able to set new admin
    /// @param _admin Address of multisig that becomes new admin
    function setAdminByAdmin(address _admin) public {
        require(msg.sender == admin, "msg.sender not admin");

        admin = _admin;
    }

    /// @notice Admin is able to change owner
    /// @param _owner Address of new owner
    function setOwnerByAdmin(address _owner) public {
        require(msg.sender == admin, "msg.sender not admin");

        owner = _owner;
    }

    /// @notice Destroy the contract
    function kill() public onlyOwner {
        selfdestruct(payable(owner));
    }

    /// @notice  withdraw stuck funds
    function withdrawStuckFunds(address _token, uint _amount) public onlyOwner {
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            payable(owner).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(owner, _amount);
        }
    }
}
