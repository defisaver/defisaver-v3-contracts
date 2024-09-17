// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSExchangeHelper } from "../DFSExchangeHelper.sol";
import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { SafeERC20 } from "../../utils/SafeERC20.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";

/// @title Wrapper contract which will be used if offchain exchange used is Odos
contract OdosWrapper is IOffchainWrapper, DFSExchangeHelper, AdminAuth {

    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @notice offchainData.callData should be this struct encoded
    struct OdosCalldata{
        bytes realCalldata;
        uint256 offset;
    }

    /// @notice Takes order from Odos and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function takeOrder(
        ExchangeData memory _exData
    ) override public payable returns (bool success, uint256) {
        OdosCalldata memory odosCalldata = abi.decode(_exData.offchainData.callData, (OdosCalldata));

        // approve odos allowance contract
        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        // write in the exact amount we are selling/buying in an order
        writeUint256(odosCalldata.realCalldata, odosCalldata.offset, _exData.srcAmount);

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        (success, ) = _exData.offchainData.exchangeAddr.call(odosCalldata.realCalldata);
        uint256 tokensSwapped = 0;

        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
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
