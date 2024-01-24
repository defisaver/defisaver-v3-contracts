// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";

contract ExchangeAggregatorRegistry is AdminAuth {
    mapping(address => bool) public exchangeTargetAddresses;

    error EmptyAddrError();

    function setExchangeTargetAddr(address _exchangeAddr, bool _state) public onlyOwner {
        if(_exchangeAddr == address(0)) {
			revert EmptyAddrError();
		}

        exchangeTargetAddresses[_exchangeAddr] = _state;
    }

    function isExchangeAggregatorAddr(address _exchangeAddr) public view returns (bool) {
        return exchangeTargetAddresses[_exchangeAddr];
    }
}
