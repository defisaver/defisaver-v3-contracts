// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSExchangeHelper } from "../DFSExchangeHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title ParaswapWrapper
/// @notice Wrapper contract used when the off-chain exchange is Paraswap.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract ParaswapWrapper is IOffchainWrapper, DFSExchangeHelper, DFSExchangeData, AdminAuth {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @notice offchainData.callData should be this struct encoded
    /// @param realCalldata The real calldata to call the Paraswap exchange
    /// @param offset The offset used to slice the exact amount we are selling/buying in an order
    struct ParaswapCalldata {
        bytes realCalldata;
        uint256 offset;
    }

    /// @notice Takes order from Paraswap and returns bool indicating if it is successful
    /// @param _exData The exchange data
    /// @return success Whether the swap was successful
    /// @return tokensSwapped Amount of tokens swapped
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        returns (bool success, uint256 tokensSwapped)
    {
        ParaswapCalldata memory paraswapCalldata =
            abi.decode(_exData.offchainData.callData, (ParaswapCalldata));

        // approve paraswap allowance contract
        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        // write in the exact amount we are selling/buying in an order
        writeUint256(paraswapCalldata.realCalldata, paraswapCalldata.offset, _exData.srcAmount);

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        (success,) = _exData.offchainData.exchangeAddr.call(paraswapCalldata.realCalldata);

        if (success) {
            // Gets the current balance of the swapped tokens.
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;

            if (tokensSwapped == 0) revert ZeroTokensSwapped();
        }

        // Sends leftover tokens including ETH to the caller.
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable virtual { }
}
