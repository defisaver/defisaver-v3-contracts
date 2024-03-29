// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces//exchange/IKyberNetworkProxy.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "./helpers/WrapperHelper.sol";
import "../../utils/TokenUtils.sol";

contract KyberWrapperV3 is DSMath, IExchangeV3, AdminAuth, WrapperHelper {

    error WrongDestAmountError(uint256, uint256);
    using SafeERC20 for IERC20;

    /// @notice Sells a _srcAmount of tokens at Kyber
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @return uint Destination amount
    function sell(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory) external override returns (uint) {
        IERC20 srcToken = IERC20(_srcAddr);
        IERC20 destToken = IERC20(_destAddr);

        KyberNetworkProxyInterface kyberNetworkProxy = KyberNetworkProxyInterface(KYBER_INTERFACE);

        srcToken.safeApprove(address(kyberNetworkProxy), _srcAmount);

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        uint destAmount = kyberNetworkProxy.trade(
            srcToken,
            _srcAmount,
            destToken,
            msg.sender,
            type(uint).max,
            0, /// @dev DFSExchangeCore contains slippage check instead of writing it here
            WALLET_ID
        );

        return destAmount;
    }

    /// @notice Return a rate for which we can sell an amount of tokens
    /// @dev Will fail if token is over 18 decimals
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _srcAmount From amount
    /// @return rate Rate
    function getSellRate(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory) public override view returns (uint rate) {
        (rate, ) = KyberNetworkProxyInterface(KYBER_INTERFACE)
            .getExpectedRate(IERC20(_srcAddr), IERC20(_destAddr), _srcAmount);

        // multiply with decimal difference in src token
        rate = rate * (10 ** (18 - getDecimals(_srcAddr)));
        // divide with decimal difference in dest token
        rate = rate / (10 ** (18 - getDecimals(_destAddr)));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() payable external {}

    function getDecimals(address _token) internal view returns (uint256) {
        if (_token == TokenUtils.ETH_ADDR) return 18;

        return IERC20(_token).decimals();
    }
}
