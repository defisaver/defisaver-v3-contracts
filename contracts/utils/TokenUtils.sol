// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../interfaces/IWETH.sol";
import "./SafeERC20.sol";

library TokenUtils {
    using SafeERC20 for IERC20;

    address public constant WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // mainnet
	address public constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function approveToken(address _tokenAddr, address _to, uint _amount) internal {
        if (_tokenAddr == ETH_ADDR) return;
        
        if (IERC20(_tokenAddr).allowance(address(this), _to) < _amount) {
            IERC20(_tokenAddr).safeApprove(_to, _amount);
        }
    }

    function pullTokens(address _token, address _from, uint256 _amount) internal returns (uint) {

        // handle max uint amount
        if (_amount == uint(-1)) {
            uint allowance = uint (-1);

            if (_token == ETH_ADDR) {
                allowance = IERC20(_token).allowance(address(this), _from);
            }

            uint balance = getBalance(_token, _from);

            _amount = (balance > allowance) ? allowance : balance;
        }

        if (_from != address(0) && _from != address(this) && _token != ETH_ADDR && _amount != 0) {
            IERC20(_token).safeTransferFrom(_from, address(this), _amount);
        }

        return _amount;
    }

    function withdrawTokens(
        address _token,
        address _to,
        uint256 _amount
    ) internal returns (uint) {
        if (_amount == uint(-1)) {
            _amount = getBalance(_token, address(this));
        }

        if (_to != address(0) && _to != address(this) && _amount != 0) {
            if (_token != ETH_ADDR) {
                IERC20(_token).safeTransfer(_to, _amount);
            } else {
                payable(_to).transfer(_amount);
            }
        }

        return _amount;
    }

    function convertAndDepositToWeth(address _tokenAddr, uint _amount) internal returns (address) {
        if (_tokenAddr == ETH_ADDR) {
            uint256 oldBalance = getBalance(_tokenAddr, msg.sender);
            IWETH(WETH_ADDR).deposit{value: _amount}();
            assert(getBalance(_tokenAddr, msg.sender) == oldBalance + _amount);
            return WETH_ADDR;
        } else {
            return _tokenAddr;
        }
    }

    function withdrawWeth(uint _amount) internal {
        IWETH(WETH_ADDR).withdraw(_amount);
    }

    function getBalance(address _tokenAddr, address _acc) internal view returns (uint) {
        if (_tokenAddr == ETH_ADDR) {
            return _acc.balance;
        } else {
            return IERC20(_tokenAddr).balanceOf(_acc);
        }
    }

    function convertToWeth(address _tokenAddr) internal pure returns (address){
        return _tokenAddr == ETH_ADDR ? WETH_ADDR : _tokenAddr;
    }

    function convertToEth(address _tokenAddr) internal pure returns (address){
        return _tokenAddr == WETH_ADDR ? ETH_ADDR : _tokenAddr;
    }

    function getTokenDecimals(address _token) internal view returns (uint256) {
        if (_token == ETH_ADDR) return 18;

        return IERC20(_token).decimals();
    }
}
