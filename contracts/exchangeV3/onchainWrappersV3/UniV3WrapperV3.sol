// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { ISwapRouter } from "../../interfaces/exchange/ISwapRouter.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";
import { IQuoter } from "../../interfaces/exchange/IQuoter.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title UniV3WrapperV3
/// @notice Wrapper contract used when the on-chain exchange is UniswapV3.
/// @dev See IExchangeV3 for the shared security assumptions.
contract UniV3WrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper, ReentrancyGuardTransient {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    ISwapRouter public constant router = ISwapRouter(UNI_V3_ROUTER);
    IQuoter public constant quoter = IQuoter(UNI_V3_QUOTER);

    /// @inheritdoc IExchangeV3
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        /// @dev DFSExchangeCore contains slippage check instead of writing it here.
        /// @dev On-chain wrapper only used for simulations and strategies, in both cases we are ok with setting a dynamic timestamp.
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: _additionalData,
            recipient: msg.sender,
            deadline: block.timestamp + 1,
            amountIn: _srcAmount,
            amountOutMinimum: 1
        });

        amountOut = router.exactInput(params);

        _srcAddr.removeAllowance(address(router));

        // Sends leftover source tokens to the caller.
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }

        return amountOut;
    }

    /// @inheritdoc IExchangeV3
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData)
        public
        override
        returns (uint256 rate)
    {
        uint256 amountOut = quoter.quoteExactInput(_additionalData, _srcAmount);
        rate = wdiv(amountOut, _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
