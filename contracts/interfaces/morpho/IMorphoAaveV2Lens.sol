// SPDX-License-Identifier: GNU AGPLv3
pragma solidity >=0.5.0;

import "./MorphoTypes.sol";

interface IMorphoAaveV2Lens {
    /// STORAGE ///

    function DEFAULT_LIQUIDATION_CLOSE_FACTOR() external view returns (uint16);

    function HEALTH_FACTOR_LIQUIDATION_THRESHOLD() external view returns (uint256);

    function ST_ETH() external view returns (address);

    function ST_ETH_BASE_REBASE_INDEX() external view returns (uint256);

    function morpho() external view returns (address);

    function addressesProvider() external view returns (address);

    function pool() external view returns (address);

    /// GENERAL ///

    function getTotalSupply()
        external
        view
        returns (
            uint256 p2pSupplyAmount,
            uint256 poolSupplyAmount,
            uint256 totalSupplyAmount
        );

    function getTotalBorrow()
        external
        view
        returns (
            uint256 p2pBorrowAmount,
            uint256 poolBorrowAmount,
            uint256 totalBorrowAmount
        );

    /// MARKETS ///

    function isMarketCreated(address _poolToken) external view returns (bool);

    /// @dev Deprecated.
    function isMarketCreatedAndNotPaused(address _poolToken) external view returns (bool);

    /// @dev Deprecated.
    function isMarketCreatedAndNotPausedNorPartiallyPaused(address _poolToken)
        external
        view
        returns (bool);

    function getAllMarkets() external view returns (address[] memory marketsCreated_);

    function getMainMarketData(address _poolToken)
        external
        view
        returns (
            uint256 avgSupplyRatePerYear,
            uint256 avgBorrowRatePerYear,
            uint256 p2pSupplyAmount,
            uint256 p2pBorrowAmount,
            uint256 poolSupplyAmount,
            uint256 poolBorrowAmount
        );

    function getAdvancedMarketData(address _poolToken)
        external
        view
        returns (
            Types.Indexes memory indexes,
            uint32 lastUpdateTimestamp,
            uint256 p2pSupplyDelta,
            uint256 p2pBorrowDelta
        );

    function getMarketConfiguration(address _poolToken)
        external
        view
        returns (
            address underlying,
            bool isCreated,
            bool isP2PDisabled,
            bool isPaused,
            bool isPartiallyPaused,
            uint16 reserveFactor,
            uint16 p2pIndexCursor,
            uint256 loanToValue,
            uint256 liquidationThreshold,
            uint256 liquidationBonus,
            uint256 decimals
        );

    function getMarketPauseStatus(address _poolToken)
        external
        view
        returns (Types.MarketPauseStatus memory);

    function getTotalMarketSupply(address _poolToken)
        external
        view
        returns (uint256 p2pSupplyAmount, uint256 poolSupplyAmount);

    function getTotalMarketBorrow(address _poolToken)
        external
        view
        returns (uint256 p2pBorrowAmount, uint256 poolBorrowAmount);

    /// INDEXES ///

    function getCurrentP2PSupplyIndex(address _poolToken) external view returns (uint256);

    function getCurrentP2PBorrowIndex(address _poolToken) external view returns (uint256);

    function getIndexes(address _poolToken) external view returns (Types.Indexes memory indexes);

    /// USERS ///

    function getEnteredMarkets(address _user)
        external
        view
        returns (address[] memory enteredMarkets);

    function getUserHealthFactor(address _user) external view returns (uint256 healthFactor);

    function getUserBalanceStates(address _user)
        external
        view
        returns (Types.LiquidityData memory assetData);

    function getCurrentSupplyBalanceInOf(address _poolToken, address _user)
        external
        view
        returns (
            uint256 balanceInP2P,
            uint256 balanceOnPool,
            uint256 totalBalance
        );

    function getCurrentBorrowBalanceInOf(address _poolToken, address _user)
        external
        view
        returns (
            uint256 balanceInP2P,
            uint256 balanceOnPool,
            uint256 totalBalance
        );

    function getUserMaxCapacitiesForAsset(address _user, address _poolToken)
        external
        view
        returns (uint256 withdrawable, uint256 borrowable);

    function getUserHypotheticalBalanceStates(
        address _user,
        address _poolToken,
        uint256 _withdrawnAmount,
        uint256 _borrowedAmount
    ) external view returns (Types.LiquidityData memory assetData);

    function getUserHypotheticalHealthFactor(
        address _user,
        address _poolToken,
        uint256 _withdrawnAmount,
        uint256 _borrowedAmount
    ) external view returns (uint256 healthFactor);

    function getUserLiquidityDataForAsset(
        address _user,
        address _poolToken,
        address _oracle
    ) external view returns (Types.AssetLiquidityData memory assetData);

    function isLiquidatable(address _user) external view returns (bool);

    function isLiquidatable(address _user, address _poolToken) external view returns (bool);

    function computeLiquidationRepayAmount(
        address _user,
        address _poolTokenBorrowed,
        address _poolTokenCollateral
    ) external view returns (uint256 toRepay);

    /// RATES ///

    function getNextUserSupplyRatePerYear(
        address _poolToken,
        address _user,
        uint256 _amount
    )
        external
        view
        returns (
            uint256 nextSupplyRatePerYear,
            uint256 balanceInP2P,
            uint256 balanceOnPool,
            uint256 totalBalance
        );

    function getNextUserBorrowRatePerYear(
        address _poolToken,
        address _user,
        uint256 _amount
    )
        external
        view
        returns (
            uint256 nextBorrowRatePerYear,
            uint256 balanceInP2P,
            uint256 balanceOnPool,
            uint256 totalBalance
        );

    function getCurrentUserSupplyRatePerYear(address _poolToken, address _user)
        external
        view
        returns (uint256);

    function getCurrentUserBorrowRatePerYear(address _poolToken, address _user)
        external
        view
        returns (uint256);

    function getAverageSupplyRatePerYear(address _poolToken)
        external
        view
        returns (
            uint256 avgSupplyRatePerYear,
            uint256 p2pSupplyAmount,
            uint256 poolSupplyAmount
        );

    function getAverageBorrowRatePerYear(address _poolToken)
        external
        view
        returns (
            uint256 avgBorrowRatePerYear,
            uint256 p2pBorrowAmount,
            uint256 poolBorrowAmount
        );

    function getRatesPerYear(address _poolToken)
        external
        view
        returns (
            uint256 p2pSupplyRate,
            uint256 p2pBorrowRate,
            uint256 poolSupplyRate,
            uint256 poolBorrowRate
        );
}
