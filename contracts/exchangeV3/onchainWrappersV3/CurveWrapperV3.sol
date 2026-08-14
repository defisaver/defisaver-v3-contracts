// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { ISwapRouterNG } from "../../interfaces/protocols/curve/ISwapRouterNG.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title CurveWrapperV3
/// @notice Wrapper contract used when the on-chain exchange is Curve.
/// @notice On-chain wrappers are primarily used for simulations and testing.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract CurveWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @notice Sells _srcAmount of tokens on Curve
    /// @param _srcAddr The token to sell
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData The Curve route and swap params
    /// @return amountOut Amount of tokens received
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData)
        external
        override
        returns (uint256 amountOut)
    {
        ISwapRouterNG exchangeContract = ISwapRouterNG(CURVE_ROUTER_NG);
        IERC20(_srcAddr).safeApprove(address(exchangeContract), _srcAmount);

        (address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools) =
            abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        amountOut = exchangeContract.exchange(
            _route,
            _swap_params,
            _srcAmount,
            1,
            /// @dev DFSExchangeCore contains slippage check instead of writing it here
            _pools,
            msg.sender
        );

        // Sends leftover source tokens to the caller.
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount The amount of tokens to sell
    /// @param _additionalData The Curve route and swap params
    /// @return rate The sell rate
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData)
        public
        view
        override
        returns (uint256 rate)
    {
        ISwapRouterNG exchangeContract = ISwapRouterNG(CURVE_ROUTER_NG);
        (address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools) =
            abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        uint256 amountOut = exchangeContract.get_dy(_route, _swap_params, _srcAmount, _pools);
        rate = wdiv(amountOut, _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
