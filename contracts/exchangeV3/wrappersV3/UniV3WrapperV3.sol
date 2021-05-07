// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;


import "../../utils/TokenUtils.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/exchange/ISwapRouter.sol";
import "../../interfaces/exchange/IQuoter.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";

/// @title DFS exchange wrapper for UniswapV2
contract UniV3WrapperV3 is DSMath, IExchangeV3, AdminAuth {
    
    using TokenUtils for address;
    using SafeERC20 for IERC20;
    address public constant KYBER_ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    ISwapRouter public constant router = ISwapRouter(0x0);
    IQuoter public constant quoter = IQuoter(0x0);
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

    function getSellRate(address, address, uint _srcAmount, bytes memory _additionalData) public override returns (uint) {
        return quoter.quoteExactInput(_additionalData, _srcAmount);
    }

    function getBuyRate(address, address, uint _destAmount, bytes memory _additionalData) public override returns (uint) {
        return quoter.quoteExactOutput(_additionalData, _destAmount);
    }

    /// @notice Send any leftover tokens, we use to clear out srcTokens after buy
    /// @param _srcAddr Source token address
    function sendLeftOver(address _srcAddr) internal {
        msg.sender.transfer(address(this).balance);

        if (_srcAddr != KYBER_ETH_ADDRESS) {
            IERC20(_srcAddr).safeTransfer(msg.sender, IERC20(_srcAddr).balanceOf(address(this)));
        }
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}