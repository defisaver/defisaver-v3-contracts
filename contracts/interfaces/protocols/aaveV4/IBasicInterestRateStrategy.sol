// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IBasicInterestRateStrategy {
    /// @notice Calculates the interest rate depending on the asset's state and configurations.
    /// @param assetId The identifier of the asset.
    /// @param liquidity The current available liquidity of the asset.
    /// @param drawn The current drawn amount of the asset.
    /// @param deficit The current deficit of the asset.
    /// @param swept The current swept (reinvested) amount of the asset.
    /// @return The interest rate, expressed in RAY.
    function calculateInterestRate(
        uint256 assetId,
        uint256 liquidity,
        uint256 drawn,
        uint256 deficit,
        uint256 swept
    ) external view returns (uint256);
}
