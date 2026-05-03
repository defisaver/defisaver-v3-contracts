// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { IUniswapRouter } from "../../interfaces/exchange/IUniswapRouter.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title UniswapWrapperV3
/// @notice Wrapper contract used when the on-chain exchange is UniswapV2.
/// @notice On-chain wrappers are primarily used for simulations and testing.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract UniswapWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    IUniswapRouter public constant router = IUniswapRouter(UNI_V2_ROUTER);

    /// @notice Sells a _srcAmount of tokens at UniswapV2
    /// @param _srcAddr The token to sell
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData The UniswapV2 swap path
    /// @return amountOut Amount of destination tokens received
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes memory _additionalData)
        external
        override
        returns (uint256 amountOut)
    {
        uint256[] memory amounts;
        address[] memory path = abi.decode(_additionalData, (address[]));

        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        /// @dev DFSExchangeCore contains slippage check instead of writing it here (minOutput = 1)
        /// @dev On-chain wrapper only used for simulations and strategies, in both cases we are ok with setting a dynamic timestamp
        amounts =
            router.swapExactTokensForTokens(_srcAmount, 1, path, msg.sender, block.timestamp + 1);

        // Sends leftover source tokens to the caller.
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }

        amountOut = amounts[amounts.length - 1];
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData The UniswapV2 swap path
    /// @return rate The sell rate
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData)
        public
        view
        override
        returns (uint256 rate)
    {
        address[] memory path = abi.decode(_additionalData, (address[]));

        uint256[] memory amounts = router.getAmountsOut(_srcAmount, path);
        rate = wdiv(amounts[amounts.length - 1], _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
