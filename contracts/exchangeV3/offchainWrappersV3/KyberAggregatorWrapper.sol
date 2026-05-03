// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { IKyberScaleHelper } from "../../interfaces/exchange/IKyberScaleHelper.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSExchangeHelper } from "../DFSExchangeHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title KyberAggregatorWrapper
/// @notice Wrapper contract used when the off-chain exchange is KyberSwap Aggregator.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract KyberAggregatorWrapper is
    IOffchainWrapper,
    DFSExchangeHelper,
    DFSExchangeData,
    AdminAuth,
    CoreHelper
{
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @notice Takes order from Kyberswap and returns bool indicating if it is successful
    /// @param _exData The exchange data
    /// @return success Whether the swap was successful
    /// @return tokensSwapped Amount of tokens swapped
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        returns (bool success, uint256 tokensSwapped)
    {
        address scalingHelperAddr = registry.getAddr(DFSIds.KYBER_SCALING_HELPER);
        (bool isScalingSuccess, bytes memory scaledCalldata) = IKyberScaleHelper(scalingHelperAddr)
            .getScaledInputData(_exData.offchainData.callData, _exData.srcAmount);

        if (!isScalingSuccess) {
            // Sends leftover tokens including ETH to the caller.
            sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
            return (false, 0);
        }

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));
        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        (success,) = _exData.offchainData.exchangeAddr.call(scaledCalldata);

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
