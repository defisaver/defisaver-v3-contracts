// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { ISwapRouter02 } from "../../interfaces/exchange/ISwapRouter02.sol";
import { IQuoter } from "../../interfaces/exchange/IQuoter.sol";
import { DSMath } from "../../DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { SafeERC20 } from "../../utils/SafeERC20.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";

/// @title DFS exchange wrapper for UniswapV3, different on base because of the router
contract UniV3WrapperV3Base is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    ISwapRouter02 public constant router = ISwapRouter02(UNI_V3_ROUTER);
    IQuoter public constant quoter = IQuoter(UNI_V3_QUOTER);

    /// @notice Sells _srcAmount of tokens at UniswapV3
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @param _additionalData Path for swapping
    /// @return uint amount of tokens received from selling
    /// @dev On-chain wrapper only used for simulations and strategies, in both cases we are ok with setting a dynamic timestamp
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes calldata _additionalData)
        external
        override
        returns (uint256)
    {
        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        ISwapRouter02.ExactInputParams memory params = ISwapRouter02.ExactInputParams({
            path: _additionalData,
            recipient: msg.sender,
            amountIn: _srcAmount,
            amountOutMinimum: 1
        });
        /// @dev DFSExchangeCore contains slippage check

        uint256 amountOut = router.exactInput(params);

        // cleanup tokens if anything left after sell
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }

        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount From amount
    /// @param _additionalData path object (encoded path_fee_path_fee_path etc.)
    /// @return uint Rate (price)
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData)
        public
        override
        returns (uint256)
    {
        uint256 amountOut = quoter.quoteExactInput(_additionalData, _srcAmount);
        return wdiv(amountOut, _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
