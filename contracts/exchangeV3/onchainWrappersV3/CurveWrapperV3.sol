// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { ISwapRouterNG } from "../../interfaces/protocols/curve/ISwapRouterNG.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title CurveWrapperV3
/// @notice Wrapper contract used when the on-chain exchange is Curve.
/// @dev See IExchangeV3 for the shared security assumptions.
contract CurveWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @inheritdoc IExchangeV3
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        ISwapRouterNG exchangeContract = ISwapRouterNG(CURVE_ROUTER_NG);
        IERC20(_srcAddr).safeApprove(address(exchangeContract), _srcAmount);

        (address[11] memory _route, uint256[5][5] memory _swap_params, address[5] memory _pools) =
            abi.decode(_additionalData, (address[11], uint256[5][5], address[5]));

        /// @dev DFSExchangeCore contains slippage check instead of writing it here.
        amountOut =
            exchangeContract.exchange(_route, _swap_params, _srcAmount, 1, _pools, msg.sender);

        _srcAddr.removeAllowance(address(exchangeContract));

        // Sends leftover source tokens to the caller.
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }
    }

    /// @inheritdoc IExchangeV3
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
