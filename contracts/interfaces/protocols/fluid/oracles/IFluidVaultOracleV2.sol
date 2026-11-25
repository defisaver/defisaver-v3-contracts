// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IFluidVaultOracleV2 {
    struct OracleConfig {
        address usdOracle;
        address supplyToken0;
        address supplyToken1;
        address borrowToken0;
        address borrowToken1;
        address supplyDexPool;
        address borrowDexPool;
        uint256 supplyEMode;
        uint256 borrowEMode;
    }

    function getOracleConfig() external view returns (OracleConfig memory);
}

interface IFluidUsdOracleV2 {
    /// @notice Resolver/UI price, in 1e27 USD per whole token, with token decimals.
    function getPriceDetailedViewRaw(
        address token,
        uint256 eMode,
        bool isOperate,
        bool isCollateral
    ) external view returns (uint256 price, uint8 decimals, uint8 tokenType);
}
