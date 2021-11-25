// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/SafeERC20.sol";
import "../../interfaces//exchange/IKyberNetworkProxy.sol";
import "../../interfaces/exchange/IExchangeV3.sol";
import "../../DS/DSMath.sol";
import "../../auth/AdminAuth.sol";
import "./helpers/WrapperHelper.sol";


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

        uint destAmount = kyberNetworkProxy.trade(
            srcToken,
            _srcAmount,
            destToken,
            msg.sender,
            type(uint).max,
            0,
            WALLET_ID
        );

        return destAmount;
    }

    /// @notice Buys a _destAmount of tokens at Kyber
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _destAmount To amount
    /// @return uint srcAmount
    function buy(address _srcAddr, address _destAddr, uint _destAmount, bytes memory) external override returns(uint) {
        IERC20 srcToken = IERC20(_srcAddr);
        IERC20 destToken = IERC20(_destAddr);

        uint256 srcAmount = srcToken.balanceOf(address(this));

        KyberNetworkProxyInterface kyberNetworkProxy = KyberNetworkProxyInterface(KYBER_INTERFACE);

        srcToken.safeApprove(address(kyberNetworkProxy), srcAmount);

        uint destAmount = kyberNetworkProxy.trade(
            srcToken,
            srcAmount,
            destToken,
            msg.sender,
            _destAmount,
            0,
            WALLET_ID
        );

        if (destAmount != _destAmount){
            revert WrongDestAmountError(destAmount, _destAmount);
        }

        uint256 srcAmountAfter = srcToken.balanceOf(address(this));

        // Send the leftover from the source token back
        sendLeftOver(_srcAddr);

        return (srcAmount - srcAmountAfter);
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
        rate = rate / (10 ** (18 - getDecimals(_srcAddr)));
    }

    /// @notice Return a rate for which we can buy an amount of tokens
    /// @param _srcAddr From token
    /// @param _destAddr To token
    /// @param _destAmount To amount
    /// @return rate Rate
    function getBuyRate(address _srcAddr, address _destAddr, uint _destAmount, bytes memory _additionalData) public override view returns (uint rate) {
        uint256 srcRate = getSellRate(_destAddr, _srcAddr, _destAmount, _additionalData);
        uint256 srcAmount = wmul(srcRate, _destAmount);

        rate = getSellRate(_srcAddr, _destAddr, srcAmount, _additionalData);

        // increase rate by 3% too account for inaccuracy between sell/buy conversion
        rate = rate + (rate / 30);
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
    receive() payable external {}

    function getDecimals(address _token) internal view returns (uint256) {
        if (_token == ETH_ADDRESS) return 18;

        return IERC20(_token).decimals();
    }
}
