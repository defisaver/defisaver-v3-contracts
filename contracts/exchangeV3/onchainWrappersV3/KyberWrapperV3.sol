// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IKyberNetworkProxy } from "../../interfaces//exchange/IKyberNetworkProxy.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";
import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { DFSExchangeHelper } from "../DFSExchangeHelper.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title KyberWrapperV3
/// @notice Wrapper contract used when the on-chain exchange is Kyber.
/// @notice On-chain wrappers are primarily used for simulations and testing.
/// @dev Important security assumptions:
/// 1. Exchange wrapper contracts are not intended to be used standalone, but as part of a DFS sell action,
///    which performs additional checks before forwarding the order and a final slippage check after the swap.
///    See DFSExchangeCore for more details.
/// 2. Wrapper contracts are designed to be stateless, meaning they do not hold funds,
///    and any token balances can be cleared by anyone.
contract KyberWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper, DFSExchangeHelper {
    error WrongDestAmountError(uint256, uint256);

    using SafeERC20 for IERC20;

    /// @notice Sells a _srcAmount of tokens at Kyber
    /// @param _srcAddr The token to sell
    /// @param _destAddr The token to buy
    /// @param _srcAmount The amount of tokens to sell
    /// @return destAmount Amount of destination tokens received
    function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory)
        external
        override
        returns (uint256 destAmount)
    {
        IERC20 srcToken = IERC20(_srcAddr);
        IERC20 destToken = IERC20(_destAddr);

        IKyberNetworkProxy kyberNetworkProxy = IKyberNetworkProxy(KYBER_INTERFACE);

        srcToken.safeApprove(address(kyberNetworkProxy), _srcAmount);

        destAmount = kyberNetworkProxy.trade(
            srcToken,
            _srcAmount,
            destToken,
            msg.sender,
            type(uint256).max,
            0,
            /// @dev DFSExchangeCore contains slippage check instead of writing it here
            WALLET_ID
        );

        // Sends leftover tokens including ETH to the caller.
        sendLeftover(_srcAddr, _destAddr, payable(msg.sender));
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @dev Will fail if token is over 18 decimals
    /// @param _srcAddr The token to sell
    /// @param _destAddr The token to buy
    /// @param _srcAmount The amount of tokens to sell
    /// @return rate The sell rate
    function getSellRate(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory)
        public
        view
        override
        returns (uint256 rate)
    {
        (rate,) = IKyberNetworkProxy(KYBER_INTERFACE)
            .getExpectedRate(IERC20(_srcAddr), IERC20(_destAddr), _srcAmount);

        // multiply with decimal difference in src token
        rate = rate * (10 ** (18 - _getDecimals(_srcAddr)));
        // divide with decimal difference in dest token
        rate = rate / (10 ** (18 - _getDecimals(_destAddr)));
    }

    function _getDecimals(address _token) internal view returns (uint256) {
        if (_token == TokenUtils.ETH_ADDR) return 18;

        return IERC20(_token).decimals();
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
