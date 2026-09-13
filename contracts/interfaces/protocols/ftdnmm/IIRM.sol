// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title ftDNMM interest rate model, with WAD-scaled utilization and APR
interface IIRM {
    function borrowAPR(address asset, uint256 utilWad) external view returns (uint256 aprWad);
}
