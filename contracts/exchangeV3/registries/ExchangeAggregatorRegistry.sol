// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IExchangeAggregatorRegistry
} from "../../interfaces/exchange/IExchangeAggregatorRegistry.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

/// @title ExchangeAggregatorRegistry
/// @notice Owner-managed allowlist of call targets for offchain exchange aggregators.
contract ExchangeAggregatorRegistry is AdminAuth, IExchangeAggregatorRegistry {
    /// @notice The zero address cannot be used as an exchange target.
    error EmptyAddrError();

    /// @notice Emitted on every successful update, even when the state is unchanged.
    event ExchangeTargetAddrUpdated(address indexed exchangeAddr, bool state);

    /// @notice Whether each exchange target is currently allowed.
    mapping(address => bool) public exchangeTargetAddresses;

    /// @notice Sets permission for a nonzero exchange target. Only callable by the owner.
    /// @param _exchangeAddr Aggregator contract called to execute swaps.
    /// @param _state True to allow the target, false to revoke permission.
    function setExchangeTargetAddr(address _exchangeAddr, bool _state) external onlyOwner {
        if (_exchangeAddr == address(0)) {
            revert EmptyAddrError();
        }

        exchangeTargetAddresses[_exchangeAddr] = _state;
        emit ExchangeTargetAddrUpdated(_exchangeAddr, _state);
    }

    /// @notice Returns whether the exchange target is currently allowed.
    function isExchangeAggregatorAddr(address _exchangeAddr) external view returns (bool) {
        return exchangeTargetAddresses[_exchangeAddr];
    }
}
