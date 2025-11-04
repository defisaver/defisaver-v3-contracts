// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { IKyberScaleHelper } from "../../interfaces/exchange/IKyberScaleHelper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSExchangeHelper } from "../DFSExchangeHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

contract KyberAggregatorWrapper is
    IOffchainWrapper,
    DFSExchangeHelper,
    DFSExchangeData,
    AdminAuth,
    CoreHelper
{
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    bytes4 constant SCALING_HELPER_ID = bytes4(keccak256("KyberInputScalingHelper"));
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @notice Takes order from Kyberswap and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        returns (bool success, uint256)
    {
        address scalingHelperAddr = registry.getAddr(SCALING_HELPER_ID);
        (bool isScalingSuccess, bytes memory scaledCalldata) = IKyberScaleHelper(scalingHelperAddr)
            .getScaledInputData(_exData.offchainData.callData, _exData.srcAmount);

        if (!isScalingSuccess) {
            // returns all funds from src addr, dest addr and eth funds (protocol fee leftovers)
            sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
            return (false, 0);
        }
        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        /// @dev safeApprove is modified to always first set approval to 0, then to exact amount
        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        (success,) = _exData.offchainData.exchangeAddr.call(scaledCalldata);

        uint256 tokensSwapped = 0;

        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
            if (tokensSwapped == 0) {
                revert ZeroTokensSwapped();
            }
        }

        // returns all funds from src addr, dest addr and eth funds (protocol fee leftovers)
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));

        return (success, tokensSwapped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable virtual { }
}
