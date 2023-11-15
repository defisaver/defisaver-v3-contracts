// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/curve/ISwapRouterNG.sol";
import "../../interfaces/curve/IAddressProvider.sol";
import "../../interfaces/IERC20.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "../../utils/SafeERC20.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/WrapperHelper.sol";

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

        return amountOut;
    }

    /// @dev deprecated function
    function buy(address, address, uint, bytes calldata) external override returns(uint) {
        return 0;
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

    /// @dev deprecated function
    function getBuyRate(address, address, uint, bytes memory) public override returns (uint) {
        return 0;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}