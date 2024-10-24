// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.24;

/// @title IIRM
/// @custom:security-contact security@euler.xyz
/// @author Euler Labs (https://www.eulerlabs.com/)
/// @notice Interface of the interest rate model contracts used by EVault
interface IIRM {
    error E_IRMUpdateUnauthorized();

    /// @notice Perform potentially state mutating computation of the new interest rate
    /// @param vault Address of the vault to compute the new interest rate for
    /// @param cash Amount of assets held directly by the vault
    /// @param borrows Amount of assets lent out to borrowers by the vault
    /// @return Then new interest rate in second percent yield (SPY), scaled by 1e27
    function computeInterestRate(address vault, uint256 cash, uint256 borrows) external returns (uint256);

    /// @notice Perform computation of the new interest rate without mutating state
    /// @param vault Address of the vault to compute the new interest rate for
    /// @param cash Amount of assets held directly by the vault
    /// @param borrows Amount of assets lent out to borrowers by the vault
    /// @return Then new interest rate in second percent yield (SPY), scaled by 1e27
    function computeInterestRateView(address vault, uint256 cash, uint256 borrows) external view returns (uint256);
}
