// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {AdminAuth} from "../../auth/AdminAuth.sol";
import {DFSExchangeHelper} from "../DFSExchangeHelper.sol";
import {IOffchainWrapper} from "../../interfaces/exchange/IOffchainWrapper.sol";
import {TokenUtils} from "../../utils/TokenUtils.sol";
import {SafeERC20} from "../../utils/SafeERC20.sol";
import {IERC20} from "../../interfaces/IERC20.sol";

/// @title Wrapper contract which will be used if offchain exchange used is Bebop
contract BebopWrapper is IOffchainWrapper, DFSExchangeHelper, AdminAuth {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @notice offchainData.callData should be this struct encoded
    struct BebopCalldata {
        bytes realCalldata;
        uint256 sellTokenAmount;
        uint256 partialFillOffset;
    }

    /// @notice Takes order from Bebop and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function takeOrder(ExchangeData memory _exData) public payable override returns (bool success, uint256) {
        BebopCalldata memory bebopCalldata = abi.decode(_exData.offchainData.callData, (BebopCalldata));
        bytes memory realCalldata = bebopCalldata.realCalldata;

        if (bebopCalldata.sellTokenAmount != _exData.srcAmount) {
            writeUint256(realCalldata, bebopCalldata.partialFillOffset, _exData.srcAmount);
        }

        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);
        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        (success,) = _exData.offchainData.exchangeAddr.call(realCalldata);

        uint256 tokensSwapped = 0;
        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
            if (tokensSwapped == 0) {
                revert ZeroTokensSwapped();
            }
        }
        // returns all funds from src addr, dest addr
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
        return (success, tokensSwapped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable virtual {}
}
