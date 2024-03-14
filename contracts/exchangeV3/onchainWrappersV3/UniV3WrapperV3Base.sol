// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/exchange/ISwapRouter02.sol";
import "../../interfaces/exchange/IQuoter.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "./helpers/WrapperHelper.sol";

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
    function sell(address _srcAddr, address, uint _srcAmount, bytes calldata _additionalData) external override returns (uint) {
        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        ISwapRouter02.ExactInputParams memory params = 
            ISwapRouter02.ExactInputParams({
                path: _additionalData,
                recipient: msg.sender,
                amountIn: _srcAmount,
                amountOutMinimum: 1 /// @dev DFSExchangeCore contains slippage check
            });
        uint amountOut = router.exactInput(params);
        return amountOut;
    }


    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount From amount
    /// @param _additionalData path object (encoded path_fee_path_fee_path etc.)
    /// @return uint Rate (price)
    function getSellRate(address, address, uint _srcAmount, bytes memory _additionalData) public override returns (uint) {
        uint amountOut = quoter.quoteExactInput(_additionalData, _srcAmount);
        return wdiv(amountOut, _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}