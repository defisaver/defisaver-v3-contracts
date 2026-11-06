// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { IFlyDexAggregator } from "../../interfaces/exchange/IFlyDexAggregator.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title FlyWrapper
/// @notice Wrapper contract used when the off-chain exchange is the Fly DEX aggregator.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract FlyWrapper is
    IOffchainWrapper,
    DFSWrapperHelper,
    DFSExchangeData,
    AdminAuth,
    ReentrancyGuardTransient
{
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @notice Takes order from the Fly DEX aggregator and returns bool indicating if it is successful
    /// @param _exData The exchange data
    /// @return success Whether the swap was successful
    /// @return tokensSwapped Amount of destination tokens received
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        nonReentrant
        returns (bool success, uint256 tokensSwapped)
    {
        bytes memory realCalldata = IFlyDexAggregator(_exData.offchainData.exchangeAddr)
            .updateAmountIn(_exData.offchainData.callData, _exData.srcAmount);

        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        (success,) = _exData.offchainData.exchangeAddr.call(realCalldata);

        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
            if (tokensSwapped == 0) {
                revert ZeroTokensSwapped();
            }
        }

        _exData.srcAddr.removeAllowance(_exData.offchainData.allowanceTarget);

        // returns all funds from src addr, dest addr
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));

        return (success, tokensSwapped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable virtual { }
}
