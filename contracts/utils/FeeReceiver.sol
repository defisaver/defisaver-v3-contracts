// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./SafeERC20.sol";

/// @title Contract that receivers fees and can be withdrawn from with the admin
contract FeeReceiver {
    using SafeERC20 for IERC20;

    address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    address public constant ADMIN_ADDR = 0xA74e9791D7D66c6a14B2C571BdA0F2A1f6D64E06;
    address public constant BOT_REFILL_ADDR = 0xCD73a63f2cb03d1a11c5C009B0fB2b5c9C430754;

    modifier onlyAdmin {
        require(msg.sender == ADMIN_ADDR, "Only Admin");

        _;
    }

    /// @dev Approves bot refill as it needs to pull funds for gas feeds from this addr
    constructor() {
        IERC20(DAI_ADDR).approve(BOT_REFILL_ADDR, type(uint256).max);
        IERC20(WETH_ADDR).approve(BOT_REFILL_ADDR, type(uint256).max);
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

        (bool success, ) = _to.call{value: _amount}("");
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
    receive() external payable {}
    fallback() external payable {}
}