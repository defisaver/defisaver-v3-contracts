// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

interface IExchangeWrapper {
    function sell(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount
    ) external payable returns (uint256);

    function buy(
        address _srcAddr,
        address _destAddr,
        uint256 _destAmount
    ) external payable returns (uint256);

    function getSellRate(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount
    ) external view returns (uint256);

    function getBuyRate(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount
    ) external view returns (uint256);
}
