// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { IUniswapRouter } from "../../interfaces/exchange/IUniswapRouter.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title UniswapWrapperV3
/// @notice Wrapper contract used when the on-chain exchange is UniswapV2.
/// @dev See IExchangeV3 for the shared security assumptions.
contract UniswapWrapperV3 is
    DSMath,
    IExchangeV3,
    AdminAuth,
    WrapperHelper,
    ReentrancyGuardTransient
{
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    IUniswapRouter public constant router = IUniswapRouter(UNI_V2_ROUTER);

    /// @inheritdoc IExchangeV3
    function sell(address _srcAddr, address, uint256 _srcAmount, bytes memory _additionalData)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        uint256[] memory amounts;
        address[] memory path = abi.decode(_additionalData, (address[]));

        IERC20(_srcAddr).safeApprove(address(router), _srcAmount);

        /// @dev DFSExchangeCore contains slippage check instead of writing it here.
        /// @dev On-chain wrapper only used for simulations and strategies, in both cases we are ok with setting a dynamic timestamp.
        amounts =
            router.swapExactTokensForTokens(_srcAmount, 1, path, msg.sender, block.timestamp + 1);

        _srcAddr.removeAllowance(address(router));

        // Sends leftover source tokens to the caller.
        uint256 amountLeft = IERC20(_srcAddr).balanceOf(address(this));

        if (amountLeft > 0) {
            IERC20(_srcAddr).safeTransfer(msg.sender, amountLeft);
        }

        amountOut = amounts[amounts.length - 1];
    }

    /// @inheritdoc IExchangeV3
    function getSellRate(address, address, uint256 _srcAmount, bytes memory _additionalData)
        public
        view
        override
        returns (uint256 rate)
    {
        address[] memory path = abi.decode(_additionalData, (address[]));

        uint256[] memory amounts = router.getAmountsOut(_srcAmount, path);
        rate = wdiv(amounts[amounts.length - 1], _srcAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
