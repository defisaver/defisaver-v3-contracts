// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IKyberNetworkProxy } from "../../interfaces/exchange/IKyberNetworkProxy.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";
import { IExchangeV3 } from "../../interfaces/exchange/IExchangeV3.sol";

import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { WrapperHelper } from "./helpers/WrapperHelper.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

/// @title KyberWrapperV3
/// @notice Wrapper contract used when the on-chain exchange is Kyber.
/// @dev See IExchangeV3 for the shared security assumptions.
contract KyberWrapperV3 is
    DSMath,
    IExchangeV3,
    AdminAuth,
    WrapperHelper,
    DFSWrapperHelper,
    ReentrancyGuardTransient
{
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @inheritdoc IExchangeV3
    function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory)
        external
        override
        nonReentrant
        returns (uint256 destAmount)
    {
        IERC20 srcToken = IERC20(_srcAddr);
        IERC20 destToken = IERC20(_destAddr);

        IKyberNetworkProxy kyberNetworkProxy = IKyberNetworkProxy(KYBER_INTERFACE);

        srcToken.safeApprove(address(kyberNetworkProxy), _srcAmount);

        /// @dev DFSExchangeCore contains slippage check instead of writing it here.
        destAmount = kyberNetworkProxy.trade(
            srcToken, _srcAmount, destToken, msg.sender, type(uint256).max, 0, WALLET_ID
        );

        _srcAddr.removeAllowance(address(kyberNetworkProxy));

        // Sends leftover tokens including ETH to the caller.
        _sendLeftover(_srcAddr, _destAddr, payable(msg.sender));
    }

    /// @inheritdoc IExchangeV3
    /// @dev Will fail if token is over 18 decimals
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
