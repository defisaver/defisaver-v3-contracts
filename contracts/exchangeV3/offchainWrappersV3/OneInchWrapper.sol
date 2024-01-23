// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../DFSExchangeHelper.sol";
import "../../interfaces/exchange/IOffchainWrapper.sol";

/// @title Wrapper contract which will be used if offchain exchange used is 1Inch
contract OneInchWrapper is IOffchainWrapper, DFSExchangeHelper, AdminAuth {

    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @notice offchainData.callData should be this struct encoded
    struct OneInchCalldata{
        bytes realCalldata;
        uint256[] offsets;
    }

    /// @notice Takes order from 1inch and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function takeOrder(
        ExchangeData memory _exData
    ) override public payable returns (bool success, uint256) {
        OneInchCalldata memory oneInchCalldata = abi.decode(_exData.offchainData.callData, (OneInchCalldata));

        // write in the exact amount we are selling/buying in an order
        for (uint256 i; i < oneInchCalldata.offsets.length; i++){
            writeUint256(oneInchCalldata.realCalldata, oneInchCalldata.offsets[i], _exData.srcAmount);
        }

        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        (success, ) = _exData.offchainData.exchangeAddr.call(oneInchCalldata.realCalldata);
        uint256 tokensSwapped = 0;

        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
            if (tokensSwapped == 0){
                revert ZeroTokensSwapped();
            }
        }
        // returns all funds from src addr, dest addr
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));

        return (success, tokensSwapped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external virtual payable {}
}
