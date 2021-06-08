// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../../utils/TokenUtils.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../interfaces/exchange/IUniswapRouter.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";

/// @title DFS exchange wrapper for UniswapV2
contract UniswapWrapperV3 is DSMath, IExchangeV3, AdminAuth {

    using TokenUtils for address;

    address public constant KYBER_ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    IUniswapRouter public constant router = IUniswapRouter(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

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

    /// @notice Buys a _destAmount of tokens at UniswapV2
    /// @param _srcAddr From token
    /// @param _destAmount To amount
    /// @return uint srcAmount
    function buy(address _srcAddr, address, uint _destAmount, bytes memory _additionalData) external override returns(uint) {
        uint[] memory amounts;
        address[] memory path = abi.decode(_additionalData, (address[]));

        uint srcAmount = _srcAddr.getBalance(address(this));

        IERC20(_srcAddr).safeApprove(address(router), srcAmount);

        amounts = router.swapTokensForExactTokens(_destAmount, type(uint).max, path, msg.sender, block.timestamp + 1);

        // Send the leftover from the source token back
        sendLeftOver(_srcAddr);

        return amounts[0];
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @return uint Rate
    function getSellRate(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory _additionalData) public override view returns (uint) {
        address[] memory path = abi.decode(_additionalData, (address[]));

        uint[] memory amounts = router.getAmountsOut(_srcAmount, path);
        return wdiv(amounts[amounts.length - 1], _srcAmount);
    }

    /// @notice Return a rate for which we can buy an amount of tokens
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _destAmount To amount
    /// @return uint Rate
    function getBuyRate(address _srcAddr, address _destAddr, uint _destAmount, bytes memory _additionalData) public override view returns (uint) {

        address[] memory path = abi.decode(_additionalData, (address[]));

        uint[] memory amounts = router.getAmountsIn(_destAmount, path);
        return wdiv(_destAmount, amounts[0]);
    }

    /// @notice Send any leftover tokens, we use to clear out srcTokens after buy
    /// @param _srcAddr Source token address
    function sendLeftOver(address _srcAddr) internal {
        payable(msg.sender).transfer(address(this).balance);

        if (_srcAddr != KYBER_ETH_ADDRESS) {
            IERC20(_srcAddr).safeTransfer(msg.sender, IERC20(_srcAddr).balanceOf(address(this)));
        }
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
