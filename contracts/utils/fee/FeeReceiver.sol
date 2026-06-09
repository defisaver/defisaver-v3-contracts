// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../interfaces/token/IERC20.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";
import { UtilAddresses } from "../addresses/UtilAddresses.sol";

/// @title FeeReceiver
/// @notice Contract that receives fees withdrawable by the admin
/// @dev DO NOT DEPLOY ON L2s WITHOUT FEE_RECEIVER_ADMIN_ADDR SET
contract FeeReceiver is UtilAddresses {
    using SafeERC20 for IERC20;

    error OnlyAdminError(address sender);
    error EthSendFailedError();

    event TokenWithdrawn(address indexed tokenAddr, address indexed to, uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);
    event ApprovalChanged(address indexed tokenAddr, address indexed spender, uint256 amount);

    modifier onlyAdmin() {
        if (msg.sender != FEE_RECEIVER_ADMIN_ADDR) {
            revert OnlyAdminError(msg.sender);
        }

        _;
    }

    /// @notice Withdraws ERC20 tokens from the contract
    /// @param _tokenAddr ERC20 token address
    /// @param _to Address where the tokens will be sent
    /// @param _amount Amount of tokens to be sent, if 0 it takes the whole balance
    function withdrawToken(address _tokenAddr, address _to, uint256 _amount) external onlyAdmin {
        if (_amount == 0) {
            _amount = IERC20(_tokenAddr).balanceOf(address(this));
        }

        IERC20(_tokenAddr).safeTransfer(_to, _amount);

        emit TokenWithdrawn(_tokenAddr, _to, _amount);
    }

    /// @notice Withdraws Ether from the contract
    /// @param _to Address where Eth will be sent
    /// @param _amount Amount of Eth to be sent, if 0 it takes the whole balance
    function withdrawEth(address payable _to, uint256 _amount) external onlyAdmin {
        if (_amount == 0) {
            _amount = address(this).balance;
        }

        (bool success,) = _to.call{ value: _amount }("");
        if (!success) revert EthSendFailedError();

        emit EthWithdrawn(_to, _amount);
    }

    /// @notice Gives ERC20 token approval from this contract to an address
    /// @dev This is needed for BotRefills contract which pulls funds from FeeReceiver
    /// @param _tokenAddr ERC20 token address
    /// @param _spender Address of the address to approve
    /// @param _amount Amount to approve
    function approveAddress(address _tokenAddr, address _spender, uint256 _amount)
        external
        onlyAdmin
    {
        IERC20(_tokenAddr).safeApprove(_spender, _amount);

        emit ApprovalChanged(_tokenAddr, _spender, _amount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
    fallback() external payable { }
}
