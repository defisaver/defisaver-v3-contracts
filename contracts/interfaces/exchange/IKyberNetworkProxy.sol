// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../token/IERC20.sol";

abstract contract KyberNetworkProxyInterface {
    function maxGasPrice() external view virtual returns (uint256);

    function getUserCapInWei(address user) external view virtual returns (uint256);

    function getUserCapInTokenWei(address user, IERC20 token) external view virtual returns (uint256);

    function enabled() external view virtual returns (bool);

    function info(bytes32 id) external view virtual returns (uint256);

    function getExpectedRate(IERC20 src, IERC20 dest, uint256 srcQty)
        public
        view
        virtual
        returns (uint256 expectedRate, uint256 slippageRate);

    function tradeWithHint(
        IERC20 src,
        uint256 srcAmount,
        IERC20 dest,
        address destAddress,
        uint256 maxDestAmount,
        uint256 minConversionRate,
        address walletId,
        bytes memory hint
    ) public payable virtual returns (uint256);

    function trade(
        IERC20 src,
        uint256 srcAmount,
        IERC20 dest,
        address destAddress,
        uint256 maxDestAmount,
        uint256 minConversionRate,
        address walletId
    ) public payable virtual returns (uint256);

    function swapEtherToToken(IERC20 token, uint256 minConversionRate) external payable virtual returns (uint256);

    function swapTokenToEther(IERC20 token, uint256 tokenQty, uint256 minRate)
        external
        payable
        virtual
        returns (uint256);

    function swapTokenToToken(IERC20 src, uint256 srcAmount, IERC20 dest, uint256 minConversionRate)
        public
        virtual
        returns (uint256);
}
