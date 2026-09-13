// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title Minimal wrapper reads for the ftDNMM circuit breaker preview
interface IftYieldWrapper {
    function circuitBreaker() external view returns (address);
    function token() external view returns (address);
    function numberOfStrategies() external view returns (uint256);
    function strategies(uint256 index) external view returns (address);
}

interface IftYieldStrategy {
    function valueOfCapital() external view returns (uint256);
    function positionToken() external view returns (address);
}
