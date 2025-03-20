// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDexSmartCollOracle {
    
    /// @notice Returns number of quote tokens per 1e18 shares
    function dexSmartColSharesRates() external view returns (uint256 operate_, uint256 liquidate_);

    /// @dev Returns the configuration data of the DexSmartColOracle.
    ///
    /// @return dexPool_ The address of the Dex pool.
    /// @return reservesPegBufferPercent_ The percentage of the reserves peg buffer.
    /// @return liquidity_ The address of the liquidity contract.
    /// @return token0NumeratorPrecision_ The precision of the numerator for token0.
    /// @return token0DenominatorPrecision_ The precision of the denominator for token0.
    /// @return token1NumeratorPrecision_ The precision of the numerator for token1.
    /// @return token1DenominatorPrecision_ The precision of the denominator for token1.
    /// @return reservesConversionOracle_ The address of the reserves conversion oracle.
    /// @return reservesConversionInvert_ A boolean indicating if reserves conversion should be inverted.
    /// @return quoteInToken0_ A boolean indicating if the quote is in token0.
    function dexSmartColOracleData()
        external
        view
        returns (
            address dexPool_,
            uint256 reservesPegBufferPercent_,
            address liquidity_,
            uint256 token0NumeratorPrecision_,
            uint256 token0DenominatorPrecision_,
            uint256 token1NumeratorPrecision_,
            uint256 token1DenominatorPrecision_,
            address reservesConversionOracle_,
            bool reservesConversionInvert_,
            bool quoteInToken0_
        );

    /// @dev USED FOR NEWER DEPLOYMENTS
    /// @notice Returns the base configuration data of the FluidDexOracle.
    ///
    /// @return dexPool_ The address of the Dex pool.
    /// @return quoteInToken0_ A boolean indicating if the quote is in token0.
    /// @return liquidity_ The address of liquidity layer.
    /// @return resultMultiplier_ The result multiplier.
    /// @return resultDivisor_ The result divisor.
    function dexOracleData()
        external
        view
        returns (
            address dexPool_,
            bool quoteInToken0_,
            address liquidity_,
            uint256 resultMultiplier_,
            uint256 resultDivisor_
        );
}