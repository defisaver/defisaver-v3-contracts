// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title Minimal reads for the ftDNMM wrapper's dual-buffer circuit breaker
interface ICircuitBreaker {
    function isActive() external view returns (bool);
    function protectedContracts(address caller) external view returns (bool);
    function isWhitelistedRecipient(address recipient) external view returns (bool);
    function getRawAssetState(address asset)
        external
        view
        returns (uint256 mainBuffer, uint256 elasticBuffer, uint256 lastUpdate);
    function getAssetState(address asset, uint256 currentTvl)
        external
        view
        returns (uint256 mainBuffer, uint256 elasticBuffer, uint256 lastUpdate);
}
