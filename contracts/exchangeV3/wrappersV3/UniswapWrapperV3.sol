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

        /// @dev DFSExchangeCore contains slippage check instead of writing it here (minOutput = 1)
        /// @dev On-chain wrapper only used for simulations and strategies, in both cases we are ok with setting a dynamic timestamp
        amounts = router.swapExactTokensForTokens(_srcAmount, 1, path, msg.sender, block.timestamp + 1);

        return amounts[amounts.length - 1];
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @param _srcAmount From amount
    /// @return uint Rate
    function getSellRate(address, address, uint _srcAmount, bytes memory _additionalData) public override view returns (uint) {
        address[] memory path = abi.decode(_additionalData, (address[]));

        uint[] memory amounts = router.getAmountsOut(_srcAmount, path);
        return wdiv(amounts[amounts.length - 1], _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
