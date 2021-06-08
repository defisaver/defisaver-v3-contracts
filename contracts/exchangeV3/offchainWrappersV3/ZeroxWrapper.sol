// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../utils/SafeERC20.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "../DFSExchangeHelper.sol";
import "../../interfaces/exchange/IOffchainWrapper.sol";

contract ZeroxWrapper is IOffchainWrapper, DFSExchangeHelper, AdminAuth, DSMath {

    using TokenUtils for address;

    //Not enough funds
    error InsufficientFunds(uint256 available, uint256 required);
    //Not enough eth for protocol fee
    error InsufficientFeeFunds(uint256 available, uint256 required);
    //Order success but amount 0
    error ZeroTokensSwapped();

    using SafeERC20 for IERC20;

    /// @notice Takes order from 0x and returns bool indicating if it is successful
    /// @param _exData Exchange data
    /// @param _type Action type (buy or sell)
    function takeOrder(
        ExchangeData memory _exData,
        ExchangeActionType _type
    ) override public payable returns (bool success, uint256) {
        // check that contract have enough balance for exchange and protocol fee
        uint256 tokenBalance = _exData.srcAddr.getBalance(address(this));
        if (tokenBalance < _exData.srcAmount){
            revert InsufficientFunds(tokenBalance, _exData.srcAmount);
        }
        uint256 ethBalance = TokenUtils.ETH_ADDR.getBalance(address(this));
        if (ethBalance < _exData.offchainData.protocolFee){
            revert InsufficientFeeFunds(ethBalance, _exData.offchainData.protocolFee);
        }

        /// @dev 0x always uses max approve in v1, so we approve the exact amount we want to sell
        /// @dev safeApprove is modified to always first set approval to 0, then to exact amount
        if (_type == ExchangeActionType.SELL) {
            IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);
        } else {
            uint srcAmount = wdiv(_exData.destAmount, _exData.offchainData.price) + 1; // + 1 so we round up
            IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, srcAmount);
        }

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));
        (success, ) = _exData.offchainData.exchangeAddr.call{value: _exData.offchainData.protocolFee}(_exData.offchainData.callData);
        uint256 tokensSwapped = 0;

        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = sub(_exData.destAddr.getBalance(address(this)), tokensBefore);
            if (tokensSwapped == 0){
                revert ZeroTokensSwapped();
            }
        }

        // returns all funds from src addr, dest addr and eth funds (protocol fee leftovers)
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));

        return (success, tokensSwapped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external virtual payable {}
}