// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IExchangeAggregatorRegistry
} from "../../interfaces/exchange/IExchangeAggregatorRegistry.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

contract ExchangeAggregatorRegistry is AdminAuth, IExchangeAggregatorRegistry {
    error EmptyAddrError();

    mapping(address => bool) public exchangeTargetAddresses;

    function setExchangeTargetAddr(address _exchangeAddr, bool _state) external onlyOwner {
        if (_exchangeAddr == address(0)) {
            revert EmptyAddrError();
        }

        exchangeTargetAddresses[_exchangeAddr] = _state;
    }

    function isExchangeAggregatorAddr(address _exchangeAddr) external view returns (bool) {
        return exchangeTargetAddresses[_exchangeAddr];
    }
}
