// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IExchangeAggregatorRegistry {
    function isExchangeAggregatorAddr(address _exchangeAddr) external view returns (bool);
    function setExchangeTargetAddr(address _exchangeAddr, bool _state) external;
}
