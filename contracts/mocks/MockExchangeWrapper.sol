// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../interfaces/exchange/IExchangeV3.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { DSMath } from "../DS/DSMath.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";

/// @title DFS exchange wrapper used for mocking in tests
contract MockExchangeWrapper is DSMath, IExchangeV3, AdminAuth {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @notice Takes srcAmount of source tokens and returns dest tokens to the caller at the provided rate.
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @param _additionalData Route and swap params
    /// @return uint256 amount of tokens received from selling
    function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes calldata _additionalData) external override returns (uint) {    
        IERC20(_srcAddr).transfer(address(this), _srcAmount);

        (uint256 rate) = abi.decode(_additionalData, (uint256));
        uint256 amountOut = wmul(rate, _srcAmount);

        _destAddr.withdrawTokens(msg.sender, amountOut);

        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _additionalData Route and swap params
    /// @return uint256 Rate (price)
    function getSellRate(address, address, uint256, bytes memory _additionalData) public pure override returns (uint) {
        (uint256 rate) = abi.decode(_additionalData, (uint256));
        return rate;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}