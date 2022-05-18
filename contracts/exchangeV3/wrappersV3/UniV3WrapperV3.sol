// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/exchange/ISwapRouter.sol";
import "../../interfaces/exchange/IQuoter.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "./helpers/WrapperHelper.sol";

/// @title DFS exchange wrapper for UniswapV3
contract UniV3WrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {
    
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    ISwapRouter public constant router = ISwapRouter(UNI_V3_ROUTER);
    IQuoter public constant quoter = IQuoter(UNI_V3_QUOTER);
    /// @notice Sells _srcAmount of tokens at UniswapV3
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @param _additionalData Path for swapping
    /// @return uint amount of tokens received from selling
    function sell(address _srcAddr, address, uint _srcAmount, bytes calldata _additionalData) external override returns (uint) {
        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        ISwapRouter.ExactInputParams memory params = 
            ISwapRouter.ExactInputParams({
                path: _additionalData,
                recipient: msg.sender,
                deadline: block.timestamp + 1,
                amountIn: _srcAmount,
                amountOutMinimum: 1
            });
        uint amountOut = router.exactInput(params);
        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @param _additionalData path object (encoded path_fee_path_fee_path etc.)
    /// @return uint Rate (price)
    function getSellRate(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory _additionalData) public override returns (uint) {
        uint amountOut = quoter.quoteExactInput(_additionalData, _srcAmount);
        
        uint256 amountOutNormalized = amountOut * (10 ** (18 - _destAddr.getTokenDecimals()));
        uint256 srcAmountNormalized = _srcAmount * (10 ** (18 - _srcAddr.getTokenDecimals()));
        uint256 rate = wdiv(amountOutNormalized, srcAmountNormalized);
        return rate;
    }

    /// @notice Send any leftover tokens, we use to clear out srcTokens after buy
    /// @param _srcAddr Source token address
    function sendLeftOver(address _srcAddr) internal {
        payable(msg.sender).transfer(address(this).balance);

        if (_srcAddr != ETH_ADDRESS) {
            IERC20(_srcAddr).safeTransfer(msg.sender, IERC20(_srcAddr).balanceOf(address(this)));
        }
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}