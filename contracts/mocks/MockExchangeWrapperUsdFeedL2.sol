// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IExchangeV3 } from "../interfaces/exchange/IExchangeV3.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { SafeERC20 } from "../utils/SafeERC20.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { TokenPriceHelperL2 } from "../utils/TokenPriceHelperL2.sol";

/// @title DFS exchange wrapper used for mocking in tests
/// @dev This version calculates the rate of tokens using feeds
contract MockExchangeWrapperUsdFeedL2 is IExchangeV3, TokenPriceHelperL2 {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    /// @param _srcAddr Source token address
    /// @param _destAddr Destination token address
    /// @param _srcAmount Source token amount
    /// @return amount of destAddr tokens received
    function sell(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        bytes calldata /*_additionalData*/
    )
        external
        override
        returns (uint256)
    {
        IERC20(_srcAddr).safeTransfer(address(this), _srcAmount);

        uint256 srcTokenPriceInUSD = getPriceInUSD(_srcAddr);
        uint256 srcTokenDec = IERC20(_srcAddr).decimals();

        uint256 destTokenPriceInUSD = getPriceInUSD(_destAddr);
        uint256 destTokenDec = IERC20(_destAddr).decimals();

        uint256 amountOut =
            _srcAmount * srcTokenPriceInUSD * (10 ** destTokenDec) / ((10 ** srcTokenDec) * destTokenPriceInUSD);

        _destAddr.withdrawTokens(msg.sender, amountOut);

        return amountOut;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @return uint256 Rate (price)
    function getSellRate(address, address, uint256, bytes memory) public pure override returns (uint256) {
        revert("Not implemented");
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
