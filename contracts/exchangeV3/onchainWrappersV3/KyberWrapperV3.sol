// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IKyberNetworkProxy } from "../../interfaces//exchange/IKyberNetworkProxy.sol";
import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";
import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { DFSExchangeHelper } from "../DFSExchangeHelper.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

contract KyberWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper, DFSExchangeHelper {
    error WrongDestAmountError(uint256, uint256);

    using SafeERC20 for IERC20;

    /// @notice Sells a _srcAmount of tokens at Kyber
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @return uint Destination amount
    function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory)
        external
        override
        returns (uint256)
    {
        IERC20 srcToken = IERC20(_srcAddr);
        IERC20 destToken = IERC20(_destAddr);

        IKyberNetworkProxy kyberNetworkProxy = IKyberNetworkProxy(KYBER_INTERFACE);

        srcToken.safeApprove(address(kyberNetworkProxy), _srcAmount);

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        uint256 destAmount = kyberNetworkProxy.trade(
            srcToken,
            _srcAmount,
            destToken,
            msg.sender,
            type(uint256).max,
            0,
            /// @dev DFSExchangeCore contains slippage check instead of writing it here
            WALLET_ID
        );

        sendLeftover(_srcAddr, _destAddr, payable(msg.sender));

        return destAmount;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @dev Will fail if token is over 18 decimals
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @return rate Rate
    function getSellRate(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory)
        public
        view
        override
        returns (uint256 rate)
    {
        (rate,) = IKyberNetworkProxy(KYBER_INTERFACE)
            .getExpectedRate(IERC20(_srcAddr), IERC20(_destAddr), _srcAmount);

        // multiply with decimal difference in src token
        rate = rate * (10 ** (18 - getDecimals(_srcAddr)));
        // divide with decimal difference in dest token
        rate = rate / (10 ** (18 - getDecimals(_destAddr)));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }

    function getDecimals(address _token) internal view returns (uint256) {
        if (_token == TokenUtils.ETH_ADDR) return 18;

        return IERC20(_token).decimals();
    }
}
