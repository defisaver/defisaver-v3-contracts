// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SafeERC20 } from "./SafeERC20.sol";
import { UtilHelper } from "./helpers/UtilHelper.sol";
import { IERC20 } from "../interfaces/IERC20.sol";

/// DO NOT DEPLOY ON L2s WITHOUT FEE_RECEIVER_ADMIN_ADDR SET
/// @title Contract that receivers fees and can be withdrawn from with the admin
contract FeeReceiver is UtilHelper {
    using SafeERC20 for IERC20;

    modifier onlyAdmin() {
        require(msg.sender == FEE_RECEIVER_ADMIN_ADDR, "Only Admin");

        _;
    }

    /// @notice Withdraws ERC20 tokens from the contract
    /// @param _tokenAddr ERC20 token address
    /// @param _to Address where the tokens will be sent
    /// @param _amount Amount of tokens to be sent, if 0 it takes the whole balance
    function withdrawToken(address _tokenAddr, address _to, uint256 _amount) public onlyAdmin {
        if (_amount == 0) {
            _amount = IERC20(_tokenAddr).balanceOf(address(this));
        }

        IERC20(_tokenAddr).safeTransfer(_to, _amount);
    }

    /// @notice Withdraws Ether from the contract
    /// @param _to Address where Eth will be sent
    /// @param _amount Amount of Eth to be sent, if 0 it takes the whole balance
    function withdrawEth(address payable _to, uint256 _amount) public onlyAdmin {
        if (_amount == 0) {
            _amount = address(this).balance;
        }

        (bool success,) = _to.call{ value: _amount }("");
        require(success, "Eth send failed");
    }

    /// @notice Gives ERC20 token approval from this contract to an address
    /// @dev This is needed if we change the BotRefill contract which needs to pull funds
    /// @param _tokenAddr ERC20 token address
    /// @param _to Address of the address to approve
    /// @param _amount Amount to approve
    function approveAddress(address _tokenAddr, address _to, uint256 _amount) public onlyAdmin {
        IERC20(_tokenAddr).safeApprove(_to, _amount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
    fallback() external payable { }
}
