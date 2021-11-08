// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

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
    /// @notice Buys _destAmount of tokens at UniswapV3
    /// @param _srcAddr From token
    /// @param _destAmount To amount
    /// @param _additionalData Path for swapping
    /// @return uint amount of _srcAddr tokens sent for transaction
    function buy(address _srcAddr, address, uint _destAmount, bytes calldata _additionalData) external override returns(uint) {
        uint srcAmount = _srcAddr.getBalance(address(this));
        IERC20(_srcAddr).safeApprove(address(router), srcAmount);
        ISwapRouter.ExactOutputParams memory params = 
            ISwapRouter.ExactOutputParams({
                path: _additionalData,
                recipient: msg.sender,
                deadline: block.timestamp + 1,
                amountOut: _destAmount,
                amountInMaximum: type(uint).max
            });
        uint amountIn = router.exactOutput(params);
        sendLeftOver(_srcAddr);
        return amountIn;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount From amount
    /// @param _additionalData path object (encoded path_fee_path_fee_path etc.)
    /// @return uint Rate (price)
    function getSellRate(address, address, uint _srcAmount, bytes memory _additionalData) public override returns (uint) {
        uint amountOut = quoter.quoteExactInput(_additionalData, _srcAmount);
        return wdiv(amountOut, _srcAmount);
    }

    /// @notice Return a rate for which we can buy an amount of tokens
    /// @param _destAmount To amount
    /// @param _additionalData path object (encoded path_fee_path_fee_path etc.)
    /// @return uint Rate (price)
    function getBuyRate(address, address, uint _destAmount, bytes memory _additionalData) public override returns (uint) {
        uint amountIn = quoter.quoteExactOutput(_additionalData, _destAmount);
        return wdiv(_destAmount, amountIn);
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