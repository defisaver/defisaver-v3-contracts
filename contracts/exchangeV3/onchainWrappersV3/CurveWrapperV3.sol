// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { ISwapRouterNG } from "../../interfaces/curve/ISwapRouterNG.sol";
import { DSMath } from "../../DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { SafeERC20 } from "../../utils/SafeERC20.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";

/// @title DFS exchange wrapper for Curve
contract CurveWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @notice Sells _srcAmount of tokens on Curve
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @param _additionalData Route and swap params
    /// @return uint256 amount of tokens received from selling
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData) external override returns (uint) {
        ISwapRouterNG exchangeContract = ISwapRouterNG(CURVE_ROUTER_NG);
        IERC20(_srcAddr).safeApprove(address(exchangeContract), _srcAmount);

        (
            address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools
        ) = abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        uint256 amountOut = exchangeContract.exchange(
            _route,
            _swap_params,
            _srcAmount,
            1,   /// @dev DFSExchangeCore contains slippage check instead of writing it here
            _pools,
            msg.sender
        );

        // cleanup tokens if anything left after sell
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));
        
        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }

        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount From amount
    /// @param _additionalData Route and swap params
    /// @return uint256 Rate (price)
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData) public view override returns (uint) {
        ISwapRouterNG exchangeContract = ISwapRouterNG(CURVE_ROUTER_NG);
        (
            address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools
        ) = abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        uint256 amountOut = exchangeContract.get_dy(
            _route,
            _swap_params,
            _srcAmount,
            _pools
        );
        return wdiv(amountOut, _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}