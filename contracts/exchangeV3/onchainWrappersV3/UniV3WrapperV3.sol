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
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title UniV3WrapperV3
/// @notice Wrapper contract used when the on-chain exchange is UniswapV3.
/// @notice On-chain wrappers are primarily used for simulations and testing.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract UniV3WrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    ISwapRouter public constant router = ISwapRouter(UNI_V3_ROUTER);
    IQuoter public constant quoter = IQuoter(UNI_V3_QUOTER);

    /// @notice Sells _srcAmount of tokens at UniswapV3
    /// @param _srcAddr The token to sell
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData The UniswapV3 encoded path
    /// @return amountOut Amount of tokens received
    /// @dev On-chain wrapper only used for simulations and strategies, in both cases we are ok with setting a dynamic timestamp
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData)
        external
        override
        returns (uint256 amountOut)
    {
        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: _additionalData,
            recipient: msg.sender,
            deadline: block.timestamp + 1,
            amountIn: _srcAmount,
            amountOutMinimum: 1 // DFSExchangeCore contains slippage check
        });

        amountOut = router.exactInput(params);

        // Sends leftover source tokens to the caller.
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }

        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData The UniswapV3 encoded path
    /// @return rate The sell rate
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
