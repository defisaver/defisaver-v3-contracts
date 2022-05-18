// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/curve/ISwaps.sol";
import "../../interfaces/curve/IAddressProvider.sol";
import "../../interfaces/IERC20.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeERC20.sol";
import "./helpers/WrapperHelper.sol";

/// @title DFS exchange wrapper for Curve
contract CurveWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    IAddressProvider addressProvider = IAddressProvider(CURVE_ADDRESS_PROVIDER);

    /// @notice Sells _srcAmount of tokens on Curve
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @param _additionalData Route and swap params
    /// @return uint256 amount of tokens received from selling
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData) external override returns (uint) {    
        ISwaps exchangeContract = ISwaps(
                addressProvider.get_address(2)
        );
        IERC20(_srcAddr).safeApprove(address(exchangeContract), _srcAmount);

        (
            address[9] memory _route, uint256[3][4] memory _swap_params
        ) = abi.decode(_additionalData, (address[9], uint256[3][4]));

        address[4] memory pools;
        uint256 amountOut = exchangeContract.exchange_multiple(
            _route,
            _swap_params,
            _srcAmount,
            1,   // _expected
            pools,
            msg.sender
        );

        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @param _additionalData Route and swap params
    /// @return uint256 Rate (price)
    function getSellRate(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory _additionalData) public override returns (uint) {
        ISwaps exchangeContract = ISwaps(
                addressProvider.get_address(2)
        );
        (
            address[9] memory _route, uint256[3][4] memory _swap_params
        ) = abi.decode(_additionalData, (address[9], uint256[3][4]));

        uint256 amountOut = exchangeContract.get_exchange_multiple_amount(
            _route,
            _swap_params,
            _srcAmount
        );
        uint256 amountOutNormalized = amountOut * (10 ** (18 - _destAddr.getTokenDecimals()));
        uint256 srcAmountNormalized = _srcAmount * (10 ** (18 - _srcAddr.getTokenDecimals()));
        uint256 rate = wdiv(amountOutNormalized, srcAmountNormalized);
        return rate;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}