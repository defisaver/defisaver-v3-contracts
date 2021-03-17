// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../utils/SafeERC20.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "../DFSExchangeHelper.sol";
import "../../interfaces/exchange/IOffchainWrapper.sol";

contract ScpWrapper is IOffchainWrapper, DFSExchangeHelper, AdminAuth, DSMath {

    using TokenUtils for address;

    string public constant ERR_SRC_AMOUNT = "Not enough funds";
    string public constant ERR_PROTOCOL_FEE = "Not enough eth for protcol fee";
    string public constant ERR_TOKENS_SWAPED_ZERO = "Order success but amount 0";

    using SafeERC20 for IERC20;

    /// @notice Takes order from Scp and returns bool indicating if it is successful
    /// @param _exData Exchange data
    /// @param _type Action type (buy or sell)
    function takeOrder(
        ExchangeData memory _exData,
        ExchangeActionType _type
    ) override public payable returns (bool success, uint256) {
        // check that contract have enough balance for exchange and protocol fee
        require(_exData.srcAddr.getBalance(address(this)) >= _exData.srcAmount, ERR_SRC_AMOUNT);
        require(TokenUtils.ETH_ADDR.getBalance(address(this)) >= _exData.offchainData.protocolFee, ERR_PROTOCOL_FEE);

        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        // write in the exact amount we are selling/buing in an order
        if (_type == ExchangeActionType.SELL) {
            writeUint256(_exData.offchainData.callData, 36, _exData.srcAmount);
        } else {
            uint srcAmount = wdiv(_exData.destAmount, _exData.offchainData.price) + 1; // + 1 so we round up
            writeUint256(_exData.offchainData.callData, 36, srcAmount);
        }

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));
        (success, ) = _exData.offchainData.exchangeAddr.call{value: _exData.offchainData.protocolFee}(_exData.offchainData.callData);
        uint256 tokensSwaped = 0;

        if (success) {
            // get the current balance of the swaped tokens
            tokensSwaped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
            require(tokensSwaped > 0, ERR_TOKENS_SWAPED_ZERO);
        }

        // returns all funds from src addr, dest addr and eth funds (protocol fee leftovers)
        sendLeftover(_exData.srcAddr, _exData.destAddr, msg.sender);

        return (success, tokensSwaped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external virtual payable {}
}
