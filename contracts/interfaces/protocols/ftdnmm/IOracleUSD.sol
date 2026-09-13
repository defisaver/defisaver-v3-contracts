// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title ftDNMM USD oracle (Chainlink router), prices are WAD-scaled (1e18 = $1)
interface IOracleUSD {
    function priceUSD(address asset) external view returns (uint256 pxWad);
}
