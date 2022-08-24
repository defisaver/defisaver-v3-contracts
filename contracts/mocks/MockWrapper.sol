// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/exchange/IExchangeV3.sol";
import "../interfaces/curve/ISwaps.sol";
import "../interfaces/IERC20.sol";
import "../DS/DSMath.sol";
import "../auth/AdminAuth.sol";
import "../utils/SafeERC20.sol";
import "../utils/TokenUtils.sol";
import "../exchangeV3/wrappersV3/helpers/WrapperHelper.sol";

/// @title DFS exchange wrapper used for mocking in tests
contract MockWrapper is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    address internal immutable _this = address(this);

    /// @notice Sells _srcAmount of tokens on Curve
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @param _additionalData Route and swap params
    /// @return uint256 amount of tokens received from selling
    function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes calldata _additionalData) external override returns (uint) {    
        IERC20(_srcAddr).transfer(_this, _srcAmount);

        (uint256 rate) = abi.decode(_additionalData, (uint256));
        uint256 amountOut = wmul(rate, _srcAmount);

        _destAddr.withdrawTokens(msg.sender, amountOut);

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
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData) public override returns (uint) {
        (uint256 rate) = abi.decode(_additionalData, (uint256));
        return rate;
    }

    /// @dev deprecated function
    function getBuyRate(address, address, uint, bytes memory) public override returns (uint) {
        return 0;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}