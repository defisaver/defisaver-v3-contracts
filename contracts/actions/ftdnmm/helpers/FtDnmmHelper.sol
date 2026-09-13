// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MainnetFtDnmmAddresses } from "./MainnetFtDnmmAddresses.sol";
import { IPositionsManager } from "../../../interfaces/protocols/ftdnmm/IPositionsManager.sol";
import { IIRM } from "../../../interfaces/protocols/ftdnmm/IIRM.sol";
import { MathUtils } from "../../../_vendor/aave/MathUtils.sol";
import {
    IAccountValuesLens,
    AccountSnapshot
} from "../../../interfaces/protocols/ftdnmm/IAccountValuesLens.sol";

/// @title Shared constants and helpers for ftDNMM actions, checkers, triggers and views
contract FtDnmmHelper is MainnetFtDnmmAddresses {
    IPositionsManager public constant positionsManager = IPositionsManager(POSITIONS_MANAGER);
    IAccountValuesLens public constant valuesLens = IAccountValuesLens(ACCOUNT_VALUES_ROUTER);

    /// @notice Account-wide safety ratio (health factor) with 1e18 precision.
    /// @dev ratio = equityUSDWad / maintUSDWad. 1e18 is the liquidation boundary, higher is safer.
    ///      Returns 0 when there is no maintenance requirement or equity is zero.
    function getRatio(address _user) public view returns (uint256 ratio) {
        AccountSnapshot memory snap = valuesLens.accountValues(POSITIONS_MANAGER, _user);

        if (snap.maintUSDWad == 0) return 0;

        return snap.equityUSDWad * 1e18 / snap.maintUSDWad;
    }

    /// @notice Current debt of a user in a given asset, in underlying token amount.
    /// @dev Mirrors AccountValuesRouter._previewBorrows and PositionsManager._accrue:
    ///      round global interest up before rounding the user's share of debt up.
    function getCurrentDebt(address _user, address _asset) public view returns (uint256 debt) {
        uint256 shares = positionsManager.debtShares(_user, _asset);
        if (shares == 0) return 0;

        uint256 totalShares = positionsManager.totalDebtShares(_asset);
        if (totalShares == 0) return 0;

        (, uint256 cash, uint256 borrows,,,, uint40 lastAccrual,) = positionsManager.astate(_asset);
        if (borrows == 0) return 0;

        uint256 borrowsNow = borrows;
        if (lastAccrual != 0 && block.timestamp != lastAccrual) {
            uint256 utilWad = borrows * 1e18 / (cash + borrows);
            address irm = positionsManager.config().getAssetCfg(_asset).irm;
            uint256 aprWad = IIRM(irm).borrowAPR(_asset, utilWad);
            uint256 interestWad = aprWad * (block.timestamp - lastAccrual) / 365 days;
            borrowsNow += MathUtils.mulDivCeil(borrows, interestWad, 1e18);
        }

        debt = MathUtils.mulDivCeil(shares, borrowsNow, totalShares);
    }
}
