// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @dev All values are USD-WAD (1e18 = $1).
struct AccountSnapshot {
    /// max(coll - debt + enginePnL, 0)
    uint256 equityUSDWad;
    /// Maintenance requirement: sum of (assetValue * mmBps) for collateral + debt, plus engine maintenance.
    uint256 maintUSDWad;
    /// collUSDWad + max(enginePnL, 0)
    uint256 pnlAdjCollUSDWad;
    /// Pure on-chain collateral value: sum of (avail * oraclePrice) for collateral-flagged assets.
    uint256 collUSDWad;
    /// Pure on-chain debt value: sum of (principalNow * oraclePrice) for debt assets.
    uint256 debtUSDWad;
    /// Aggregate unrealized PnL from engine risk modules (signed).
    int256 enginePnLUSDWad;
}

/// @title Minimal interface for the ftDNMM AccountValuesRouter (values lens)
interface IAccountValuesLens {
    function accountValues(address pm, address user) external view returns (AccountSnapshot memory);
    function previewBorrowIndexWad(address pmAddr, address asset)
        external
        view
        returns (uint256 idxNow);
}
