// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/exchange/IUniswapRouter.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "./helpers/WrapperHelper.sol";

/// @title DFS exchange wrapper for UniswapV2
contract UniswapWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {

    using TokenUtils for address;

    IUniswapRouter public constant router = IUniswapRouter(UNI_V2_ROUTER);

    using SafeERC20 for IERC20;

    /// @notice Sells a _srcAmount of tokens at UniswapV2
    /// @param _srcAddr From token
    /// @param _srcAmount From amount
    /// @return uint Destination amount
    function sell(address _srcAddr, address, uint _srcAmount, bytes memory _additionalData) external override returns (uint) {
        uint[] memory amounts;
        address[] memory path = abi.decode(_additionalData, (address[]));

        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        amounts = router.swapExactTokensForTokens(_srcAmount, 1, path, msg.sender, block.timestamp + 1);

        return amounts[amounts.length - 1];
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @return uint Rate
    function getSellRate(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory _additionalData) public override view returns (uint) {
        address[] memory path = abi.decode(_additionalData, (address[]));

        uint[] memory amounts = router.getAmountsOut(_srcAmount, path);

        uint256 amountOut = amounts[amounts.length - 1];
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
