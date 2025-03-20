// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDexSmartCollOracle } from "../interfaces/fluid/oracles/IDexSmartCollOracle.sol";
import { IDexSmartDebtOracle } from "../interfaces/fluid/oracles/IDexSmartDebtOracle.sol";
import { IFluidVault } from "../interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultResolver } from "../interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { IFluidDexResolver } from "../interfaces/fluid/resolvers/IFluidDexResolver.sol";
import { IFluidLendingResolver } from "../interfaces/fluid/resolvers/IFluidLendingResolver.sol";
import { FluidRatioHelper } from "../../contracts/actions/fluid/helpers/FluidRatioHelper.sol";
import { FluidVaultTypes } from "../../contracts/actions/fluid/helpers/FluidVaultTypes.sol";
import { FluidDexModel } from "../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { IERC20 } from "../interfaces/IERC20.sol";

/// @title FluidView - aggregate various information about Fluid vaults and users
contract FluidView is FluidRatioHelper {
    using FluidVaultTypes for uint256;


    /**
     *
     *                         DATA SPECIFICATION
     *
     */
    /// @notice User position data
    struct UserPosition {
        uint256 nftId; // unique id of the position
        address owner; // owner of the position
        bool isLiquidated; // true if the position is liquidated
        bool isSupplyPosition; // true if the position is a supply position, means no debt.
        uint256 supply; // amount of supply tokens. For smart collateral vaults, this will be the amount of coll shares.
        uint256 borrow; // amount of borrow tokens. For smart debt vaults, this will be the amount of debt shares.
        uint256 ratio; // ratio of the position in 1e18
        int256 tick; // in which tick the position is. Used to calculate the ratio and borrow amount.
        uint256 tickId; // tick id of the position
    }

    /// @notice Data for the supply dex pool used in T2 and T4 vaults
    struct DexSupplyData {
       address dexPool; // address of the dex pool
        uint256 dexId;   // id of the dex pool
        uint256 fee;     // fee of the dex pool
        uint256 lastStoredPrice; // last stored price of the dex pool
        uint256 centerPrice; // center price of the dex pool
        uint256 token0Utilization; // token0 utilization
        uint256 token1Utilization; // token1 utilization
        // ONLY FOR SUPPLY
        uint256 totalSupplyShares; // total supply shares, in 1e18
        uint256 maxSupplyShares; // max supply shares, in 1e18
        uint256 token0Supplied; // token0 supplied, in token0 decimals
        uint256 token1Supplied; // token1 supplied, in token1 decimals
        uint256 sharesWithdrawable; // shares withdrawable, in 1e18
        uint256 token0Withdrawable; // token0 withdrawable, in token0 decimals
        uint256 token1Withdrawable; // token1 withdrawable, in token1 decimals
        uint256 token0PerSupplyShare; // token0 amount per 1e18 supply shares
        uint256 token1PerSupplyShare; // token1 amount per 1e18 supply shares
        uint256 token0SupplyRate; // token0 supply rate. E.g 320 = 3.2% APR
        uint256 token1SupplyRate; // token1 supply rate. E.g 320 = 3.2% APR
        address quoteToken; // quote token used in dex oracle. Either token0 or token1
        uint256 quoteTokensPerShare; // quote tokens per 1e18 shares (all reserves are converted to quote token).
    }

    /// @notice Data for the borrow dex pool used in T3 and T4 vaults
    struct DexBorrowData {
        address dexPool; // address of the dex pool
        uint256 dexId;   // id of the dex pool
        uint256 fee;     // fee of the dex pool
        uint256 lastStoredPrice; // last stored price of the dex pool
        uint256 centerPrice; // center price of the dex pool
        uint256 token0Utilization; // token0 utilization
        uint256 token1Utilization; // token1 utilization
        // ONLY FOR BORROW
        uint256 totalBorrowShares; // total borrow shares, in 1e18
        uint256 maxBorrowShares; // max borrow shares, in 1e18
        uint256 token0Borrowed; // token0 borrowed, in token0 decimals
        uint256 token1Borrowed; // token1 borrowed, in token1 decimals
        uint256 sharesBorrowable; // shares borrowable in 1e18
        uint256 token0Borrowable; // token0 borrowable in token0 decimals
        uint256 token1Borrowable; // token1 borrowable in token1 decimals
        uint256 token0PerBorrowShare; // token0 amount per 1e18 borrow shares
        uint256 token1PerBorrowShare; // token1 amount per 1e18 borrow shares
        uint256 token0BorrowRate; // token0 borrow rate. E.g 320 = 3.2% APR
        uint256 token1BorrowRate; // token1 borrow rate. E.g 320 = 3.2% APR
        address quoteToken; // quote token used in dex oracle. Either token0 or token1
        uint256 quoteTokensPerShare; // quote tokens per 1e18 shares (all reserves are converted to quote token).
    }

    /// @notice Full vault data including dex data.
    /// @dev This data is obtained by combining calls to FluidVaultResolver and FluidDexResolver.
    struct VaultData {
        address vault; // address of the vault
        uint256 vaultId; // unique id of the vault
        uint256 vaultType; // 10000 = Vault(1 coll / 1 debt), 20000 = 2/1, 30000 = 1/2, 40000 = 2/2
        bool isSmartColl; // smart collateral vaults have 2 tokens as collateral
        bool isSmartDebt; // smart debt vaults have 2 tokens as debt
        address supplyToken0; // always present
        address supplyToken1; // only used for smart collateral vaults
        address borrowToken0; // always present
        address borrowToken1; // only used for smart debt vaults
        uint256 supplyToken0Decimals; // decimals of the collateral token 0
        uint256 supplyToken1Decimals; // decimals of the collateral token 1. 0 if not present
        uint256 borrowToken0Decimals; // decimals of the debt token 0
        uint256 borrowToken1Decimals; // decimals of the debt token 1. 0 if not present
        uint16 collateralFactor; // e.g 8500 = 85%
        uint16 liquidationThreshold; // e.g 9000 = 90%
        uint16 liquidationMaxLimit;  // LML is the threshold above which 100% of your position gets liquidated instantly
        uint16 withdrawalGap; // Safety non-withdrawable amount to guarantee liquidations. E.g 500 = 5%
        uint16 liquidationPenalty; // e.g 100 = 1%, 500 = 5%
        uint16 borrowFee; // if there is any additional fee for borrowing.
        address oracle; // address of the oracle
        uint256 oraclePriceOperate; // price of the oracle (Called during operations)
        uint256 oraclePriceLiquidate; // price of the oracle (If liquidation requires different price)
        uint256 vaultSupplyExchangePrice; // vault supply exchange price.
        uint256 vaultBorrowExchangePrice; // vault borrow exchange price.
        int256 supplyRateVault; // supply rate of the vault
        int256 borrowRateVault; // borrow rate of the vault
        int256 rewardsOrFeeRateSupply; // rewards or fee rate for supply
        int256 rewardsOrFeeRateBorrow; // rewards or fee rate for borrow
        uint256 totalPositions; // Total positions in the vault
        uint256 totalSupplyVault; // Total supplied assets to the vault
        uint256 totalBorrowVault; // Total borrowed assets from the vault
        uint256 withdrawalLimit; // The limit until where you can withdraw. If 0, all users can withdraw
        uint256 withdrawableUntilLimit; // The amount that can be withdrawn until the limit
        uint256 withdrawable; // min(supply - withdrawalGap - currentLimit, availableBalance)
        uint256 baseWithdrawalLimit; // The minimum limit for a vault's withdraw. The further expansion happens on this base
        uint256 withdrawExpandPercent; // The rate at which limits would increase or decrease over the given duration. E.g 2500 = 25%
        uint256 withdrawExpandDuration; // The time for which the limits expand at the given rate (in seconds)
        uint256 borrowLimit; // The limit until where user can borrow
        uint256 borrowableUntilLimit; // borrowable amount until any borrow limit (incl. max utilization limit)
        uint256 borrowable; // min(currentLimit - borrow, borrowableMaxUtilization - borrow, availableBalance)
        uint256 borrowLimitUtilization;  // Total borrow limit for the maximum allowed utilization
        uint256 maxBorrowLimit; // The maximum limit for a vault above which it is not possible to borrow
        uint256 borrowExpandPercent; // The rate at which limits would increase or decrease over the given duration. E.g 2500 = 25%
        uint256 borrowExpandDuration; // The time for which the limits expand at the given rate (in seconds)
        uint256 baseBorrowLimit; // The minimum limit for a vault's borrow. The further expansion happens on this base
        uint256 minimumBorrowing; // The minimum amount that can be borrowed from the vault
        DexSupplyData dexSupplyData; // Dex pool supply data. Used only for T2 and T4 vaults
        DexBorrowData dexBorrowData; // Dex pool borrow data. Used only for T3 and T4 vaults
    }

    /// @notice Helper struct to group nftId, vaultId and vault address
    struct NftWithVault {
        uint256 nftId; // unique id of the position
        uint256 vaultId; // unique id of the vault
        address vaultAddr; // address of the vault
    }

    /// @notice User earn position data
    struct UserEarnPosition {
        uint256 fTokenShares; // amount of fToken shares
        uint256 underlyingAssets; // amount of underlying assets
        uint256 underlyingBalance; // amount of underlying assets in the user's wallet
        uint256 allowance; // amount of allowance for the user to spend
    }

    /// @notice FToken data for a specific fToken address used for 'earn' positions
    struct FTokenData {
        address tokenAddress; // address of the fToken
        bool isNativeUnderlying; // true if the underlying asset is native to the chain
        string name; // name of the fToken
        string symbol; // symbol of the fToken
        uint256 decimals; // decimals of the fToken
        address asset; // address of the underlying asset
        uint256 totalAssets; // total amount of underlying assets
        uint256 totalSupply; // total amount of fToken shares
        uint256 convertToShares; // convert amount of underlying assets to fToken shares
        uint256 convertToAssets; // convert amount of fToken shares to underlying assets
        uint256 rewardsRate; // additional yield from rewards, if active
        uint256 supplyRate; // yield at Liquidity
        uint256 withdrawable; // actual currently withdrawable amount (supply - withdrawal Limit) & considering balance
        bool modeWithInterest; // true if mode = with interest, false = without interest
        uint256 expandPercent; // withdrawal limit expand percent in 1e2
        uint256 expandDuration; // withdrawal limit expand duration in seconds
    }

    /**
     *
     *                         EXTERNAL FUNCTIONS
     *
     */
    /// @notice Get all user positions with vault data.
    /// @dev This should be called with static call.
    function getUserPositions(address _user) 
        external returns (UserPosition[] memory positions, VaultData[] memory vaults) 
    {
        uint256[] memory nftIds = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionsNftIdOfUser(_user);

        positions = new UserPosition[](nftIds.length);
        vaults = new VaultData[](nftIds.length);

        for (uint256 i = 0; i < nftIds.length; i++) {
            (positions[i], vaults[i]) = getPositionByNftId(nftIds[i]);
        }

        return (positions, vaults);
    }

    /// @notice Get all nftIds for a specific user
    function getUserNftIds(address _user) external view returns (uint256[] memory) {
        return IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionsNftIdOfUser(_user);
    }

    /// @notice Get all nftIds with vaultIds for a specific user
    function getUserNftIdsWithVaultIds(address _user) external view returns (NftWithVault[] memory retVal) {
        uint256[] memory nftIds = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionsNftIdOfUser(_user);
        retVal = new NftWithVault[](nftIds.length);

        for (uint256 i = 0; i < nftIds.length; i++) {
            address vaultByNft = IFluidVaultResolver(FLUID_VAULT_RESOLVER).vaultByNftId(nftIds[i]);
            uint256 vaultId = IFluidVaultResolver(FLUID_VAULT_RESOLVER).getVaultId(vaultByNft);

            retVal[i] = NftWithVault({
                nftId: nftIds[i],
                vaultId: vaultId,
                vaultAddr: vaultByNft
            });
        }
    }

    /// @notice Get position data with vault and dex data for a specific nftId
    /// @dev This should be called with static call.
    function getPositionByNftId(uint256 _nftId) public returns (UserPosition memory position, VaultData memory vault) {
        (
            IFluidVaultResolver.UserPosition memory userPosition,
            IFluidVaultResolver.VaultEntireData memory vaultData
        ) = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_nftId);

        position = UserPosition({
            nftId: userPosition.nftId,
            owner: userPosition.owner,
            isLiquidated: userPosition.isLiquidated,
            isSupplyPosition: userPosition.isSupplyPosition,
            supply: userPosition.supply,
            borrow: userPosition.borrow,
            ratio: getRatio(userPosition.nftId),
            tick: userPosition.tick,
            tickId: userPosition.tickId
        });

        vault = getVaultData(vaultData.vault);
    }

    /// @notice Get vault data for a specific vault address. This also includes dex data.
    /// @dev This should be called with static call.
    function getVaultData(address _vault) public returns (VaultData memory vaultData) {
        IFluidVaultResolver.VaultEntireData memory data = 
            IFluidVaultResolver(FLUID_VAULT_RESOLVER).getVaultEntireData(_vault);

        address supplyToken0 = data.constantVariables.supplyToken.token0;
        address supplyToken1 = data.constantVariables.supplyToken.token1;
        address borrowToken0 = data.constantVariables.borrowToken.token0;
        address borrowToken1 = data.constantVariables.borrowToken.token1;

        DexSupplyData memory dexSupplyData;
        DexBorrowData memory dexBorrowData;

        vaultData = VaultData({
            vault: _vault,
            vaultId: data.constantVariables.vaultId,
            vaultType: data.constantVariables.vaultType,
            isSmartColl: data.isSmartCol,
            isSmartDebt: data.isSmartDebt,
            
            supplyToken0: supplyToken0,
            supplyToken1: supplyToken1,
            borrowToken0: borrowToken0,
            borrowToken1: borrowToken1,

            supplyToken0Decimals: supplyToken0 != ETH_ADDR ? IERC20(supplyToken0).decimals() : 18,
            supplyToken1Decimals: supplyToken1 != address(0) ? (supplyToken1 != ETH_ADDR ? IERC20(supplyToken1).decimals() : 18) : 0,
            borrowToken0Decimals: borrowToken0 != ETH_ADDR ? IERC20(borrowToken0).decimals(): 18,
            borrowToken1Decimals: borrowToken1 != address(0) ? (borrowToken1 != ETH_ADDR ? IERC20(borrowToken1).decimals() : 18) : 0,

            collateralFactor: data.configs.collateralFactor,
            liquidationThreshold: data.configs.liquidationThreshold,
            liquidationMaxLimit: data.configs.liquidationMaxLimit,
            withdrawalGap: data.configs.withdrawalGap,
            liquidationPenalty: data.configs.liquidationPenalty,
            borrowFee: data.configs.borrowFee,
            oracle: data.configs.oracle,
            oraclePriceOperate: data.configs.oraclePriceOperate,
            oraclePriceLiquidate: data.configs.oraclePriceLiquidate,

            vaultSupplyExchangePrice: data.exchangePricesAndRates.vaultSupplyExchangePrice,
            vaultBorrowExchangePrice: data.exchangePricesAndRates.vaultBorrowExchangePrice,
            supplyRateVault: data.exchangePricesAndRates.supplyRateVault,
            borrowRateVault: data.exchangePricesAndRates.borrowRateVault,
            rewardsOrFeeRateSupply: data.exchangePricesAndRates.rewardsOrFeeRateSupply,
            rewardsOrFeeRateBorrow: data.exchangePricesAndRates.rewardsOrFeeRateBorrow,

            totalPositions: data.vaultState.totalPositions,

            totalSupplyVault: data.totalSupplyAndBorrow.totalSupplyVault,
            totalBorrowVault: data.totalSupplyAndBorrow.totalBorrowVault,

            withdrawalLimit: data.liquidityUserSupplyData.withdrawalLimit,
            withdrawableUntilLimit: data.liquidityUserSupplyData.withdrawableUntilLimit,
            withdrawable: data.liquidityUserSupplyData.withdrawable,
            baseWithdrawalLimit: data.liquidityUserSupplyData.baseWithdrawalLimit,
            withdrawExpandPercent: data.liquidityUserSupplyData.expandPercent,
            withdrawExpandDuration: data.liquidityUserSupplyData.expandDuration,

            borrowLimit: data.liquidityUserBorrowData.borrowLimit,
            borrowableUntilLimit: data.liquidityUserBorrowData.borrowableUntilLimit,
            borrowable: data.liquidityUserBorrowData.borrowable,
            borrowLimitUtilization: data.liquidityUserBorrowData.borrowLimitUtilization,
            maxBorrowLimit: data.liquidityUserBorrowData.maxBorrowLimit,
            borrowExpandPercent: data.liquidityUserBorrowData.expandPercent,
            borrowExpandDuration: data.liquidityUserBorrowData.expandDuration,
            baseBorrowLimit: data.liquidityUserBorrowData.baseBorrowLimit,

            minimumBorrowing: data.limitsAndAvailability.minimumBorrowing,

            dexSupplyData: dexSupplyData,
            dexBorrowData: dexBorrowData
        });

        // smart coll
        if (vaultData.vaultType.isT2Vault()) {
            IFluidDexResolver.DexEntireData memory dexData =
                IFluidDexResolver(FLUID_DEX_RESOLVER).getDexEntireData(data.constantVariables.supply);
            vaultData.dexSupplyData = _fillDexSupplyData(dexData, vaultData.oracle, vaultData.withdrawable);
        }

        // smart debt
        if (vaultData.vaultType.isT3Vault()) {
            IFluidDexResolver.DexEntireData memory dexData =
                IFluidDexResolver(FLUID_DEX_RESOLVER).getDexEntireData(data.constantVariables.borrow);
            vaultData.dexBorrowData = _fillDexBorrowData(dexData, vaultData.oracle, vaultData.borrowable);
        }

        // smart coll and smart debt
        if (vaultData.vaultType.isT4Vault()) {
            IFluidDexResolver.DexEntireData memory dexData =
                IFluidDexResolver(FLUID_DEX_RESOLVER).getDexEntireData(data.constantVariables.supply);

            vaultData.dexSupplyData = _fillDexSupplyData(
                dexData,
                _getSmartCollateralDexOracle(vaultData.oracle),
                vaultData.withdrawable
            );

            // if it's a same dex, no need to fetch again
            if (data.constantVariables.borrow == data.constantVariables.supply) {
                vaultData.dexBorrowData = _fillDexBorrowData(dexData, vaultData.oracle, vaultData.borrowable);
            } else {
                dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexEntireData(data.constantVariables.borrow);
                vaultData.dexBorrowData = _fillDexBorrowData(dexData, vaultData.oracle, vaultData.borrowable);
            }

            // In the case of T4 vaults, quoteTokensPerShare is actually returned as shareTokensPerQuote, so we invert it here.
            vaultData.dexBorrowData.quoteTokensPerShare = 1e54 / vaultData.dexBorrowData.quoteTokensPerShare;
        }
    }

    /// @notice Get current share rates for supply and borrow dex inside the vault
    /// @dev This should be called with static call.
    /// @dev Function will revert for T1 vaults and is expected to be called only for dex vaults
    /// @param _vault Address of the vault
    /// @return token0PerSupplyShare - filed for T2 and T4 vaults
    /// @return token1PerSupplyShare - filed for T2 and T4 vaults
    /// @return token0PerBorrowShare - filed for T3 and T4 vaults
    /// @return token1PerBorrowShare - filed fro T3 and T4 vaults
    function getDexShareRates(
        address _vault
    ) external returns (
        uint256 token0PerSupplyShare,
        uint256 token1PerSupplyShare,
        uint256 token0PerBorrowShare,
        uint256 token1PerBorrowShare
    ) {
        // Reverts for T1 vaults
        IFluidVault.ConstantViews memory vaultData = IFluidVault(_vault).constantsView();

        if (vaultData.vaultType.isT2Vault()) {
            IFluidDexResolver.DexState memory dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexState(vaultData.supply);
            token0PerSupplyShare = dexData.token0PerSupplyShare;
            token1PerSupplyShare = dexData.token1PerSupplyShare;
        }

        if (vaultData.vaultType.isT3Vault()) {
            IFluidDexResolver.DexState memory dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexState(vaultData.borrow);
            token0PerBorrowShare = dexData.token0PerBorrowShare;
            token1PerBorrowShare = dexData.token1PerBorrowShare;
        }

        if (vaultData.vaultType.isT4Vault()) {
            IFluidDexResolver.DexState memory dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexState(vaultData.supply);
            token0PerSupplyShare = dexData.token0PerSupplyShare;
            token1PerSupplyShare = dexData.token1PerSupplyShare;

            if (vaultData.borrow == vaultData.supply) {
                token0PerBorrowShare = dexData.token0PerBorrowShare;
                token1PerBorrowShare = dexData.token1PerBorrowShare;
            } else {
                dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexState(vaultData.borrow);
                token0PerBorrowShare = dexData.token0PerBorrowShare;
                token1PerBorrowShare = dexData.token1PerBorrowShare;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        FLUID EARN - F TOKENs UTILS
    //////////////////////////////////////////////////////////////*/
    /// @notice Get all fTokens addresses
    function getAllFTokens() external view returns (address[] memory) {
        return IFluidLendingResolver(FLUID_LENDING_RESOLVER).getAllFTokens();
    }

    /// @notice Get fToken data for a specific fToken address
    function getFTokenData(address _fToken) public view returns (FTokenData memory fTokenData) {
        
        IFluidLendingResolver.FTokenDetails memory details;

        // Fluid Lending Resolver checks if the fToken's underlying asset supports EIP-2612.
        // For WETH, this triggers the fallback function, which attempts a deposit.
        // This panics because of write protection and consumes all gas, leaving only 1/64th for the caller (EIP-150).
        // To lower the gas cost, we cap the gas limit at 9M, ensuring ~140k gas remains for fetching fWETH details
        // and enough gas is left for further operations within the same block.
        // For arbitrum, we don't need to cap as WETH will have EIP-2612 support.
        if (_fToken == F_WETH_TOKEN_ADDR && block.chainid != 42161) {
            details = IFluidLendingResolver(FLUID_LENDING_RESOLVER).getFTokenDetails{ gas: 9_000_000 }(_fToken);
        } else {
            details = IFluidLendingResolver(FLUID_LENDING_RESOLVER).getFTokenDetails(_fToken);
        }
        
        fTokenData = _filterFTokenData(details);
    }

    /// @notice Get fToken data for all fTokens
    function getAllFTokensData() public view returns (FTokenData[] memory) {
        address[] memory fTokens = IFluidLendingResolver(FLUID_LENDING_RESOLVER).getAllFTokens();
        FTokenData[] memory fTokenData = new FTokenData[](fTokens.length);

        for (uint256 i = 0; i < fTokens.length; i++) {
            fTokenData[i] = getFTokenData(fTokens[i]);
        } 

        return fTokenData;
    }

    /// @notice Get user position for a specific fToken address
    function getUserEarnPosition(address _fToken, address _user) public view returns (UserEarnPosition memory) {
        IFluidLendingResolver.UserPosition memory data = 
            IFluidLendingResolver(FLUID_LENDING_RESOLVER).getUserPosition(_fToken, _user);

        return UserEarnPosition({
            fTokenShares: data.fTokenShares,
            underlyingAssets: data.underlyingAssets,
            underlyingBalance: data.underlyingBalance,
            allowance: data.allowance
        });
    }

    /// @notice Get user position for a specific fToken address
    function getUserEarnPositionWithFToken(
        address _fToken,
        address _user
    ) public view returns (UserEarnPosition memory userPosition, FTokenData memory fTokenData) {
        IFluidLendingResolver.UserPosition memory userData = 
            IFluidLendingResolver(FLUID_LENDING_RESOLVER).getUserPosition(_fToken, _user);

        userPosition = UserEarnPosition({
            fTokenShares: userData.fTokenShares,
            underlyingAssets: userData.underlyingAssets,
            underlyingBalance: userData.underlyingBalance,
            allowance: userData.allowance
        });

        fTokenData = getFTokenData(_fToken);
    }

    /// @notice Get user positions for all fTokens
    function getAllUserEarnPositionsWithFTokens(address _user)
        external
        view
        returns (UserEarnPosition[] memory userPositions, FTokenData[] memory fTokensData)
    {
        fTokensData = getAllFTokensData();

        userPositions = new UserEarnPosition[](fTokensData.length);

        for (uint256 i = 0; i < fTokensData.length; i++) {
            userPositions[i] = getUserEarnPosition(fTokensData[i].tokenAddress, _user);
        }
    }

    /**
     *
     *                         INTERNAL FUNCTIONS
     *
     */
    /// @notice Helper function used for T4 vaults to determine which oracle has to be used for smart collateral DEX.
    function _getSmartCollateralDexOracle(address _vaultOracle) internal view returns (address smartCollOracle) {
        /// @dev Some T4 vaults use main oracles that contain both dexSmartDebtSharesRates and dexSmartCollSharesRates.
        /// But some use only the debt oracle as main and link the collateral oracle with a call to getDexColDebtOracleData.
        try IDexSmartCollOracle(_vaultOracle).dexSmartColSharesRates() returns (
            uint256, uint256
        ) {
            return _vaultOracle;
        } catch {
            (smartCollOracle, ) = IDexSmartDebtOracle(_vaultOracle).getDexColDebtOracleData();
        }
    }

    /// @notice Helper function to adapt dex data to DexSupplyData
    function _fillDexSupplyData(
        IFluidDexResolver.DexEntireData memory _dexData,
        address _oracle,
        uint256 _sharesWithdrawable
    ) internal view returns (DexSupplyData memory dexSupplyData) {
        address quoteToken = _isQuoteInToken0ForSmartCollOracle(_oracle)
            ? _dexData.constantViews.token0
            : _dexData.constantViews.token1;

        (uint256 quoteTokensPerShare, ) = IDexSmartCollOracle(_oracle).dexSmartColSharesRates();

        dexSupplyData = DexSupplyData({
            dexPool: _dexData.dex,
            dexId: _dexData.constantViews.dexId,
            fee: _dexData.configs.fee,
            lastStoredPrice: _dexData.dexState.lastStoredPrice,
            centerPrice: _dexData.dexState.centerPrice,
            token0Utilization: _dexData.limitsAndAvailability.liquidityTokenData0.lastStoredUtilization,
            token1Utilization: _dexData.limitsAndAvailability.liquidityTokenData1.lastStoredUtilization,
            totalSupplyShares: _dexData.dexState.totalSupplyShares,
            maxSupplyShares: _dexData.configs.maxSupplyShares,
            token0Supplied: _dexData.dexState.totalSupplyShares * _dexData.dexState.token0PerSupplyShare / 1e18,
            token1Supplied: _dexData.dexState.totalSupplyShares * _dexData.dexState.token1PerSupplyShare / 1e18,
            sharesWithdrawable: _sharesWithdrawable,
            token0Withdrawable: _sharesWithdrawable * _dexData.dexState.token0PerSupplyShare / 1e18,
            token1Withdrawable: _sharesWithdrawable * _dexData.dexState.token1PerSupplyShare / 1e18,
            token0PerSupplyShare: _dexData.dexState.token0PerSupplyShare,
            token1PerSupplyShare: _dexData.dexState.token1PerSupplyShare,
            token0SupplyRate: _dexData.limitsAndAvailability.liquidityTokenData0.supplyRate,
            token1SupplyRate: _dexData.limitsAndAvailability.liquidityTokenData1.supplyRate,
            quoteToken: quoteToken,
            quoteTokensPerShare: quoteTokensPerShare
        });
    }

    /// @notice Helper function to adapt dex data to DexBorrowData
    function _fillDexBorrowData(
        IFluidDexResolver.DexEntireData memory _dexData,
        address _oracle,
        uint256 _sharesBorrowable
    ) internal view returns (DexBorrowData memory dexBorrowData) {
        address quoteToken = _isQuoteInToken0ForSmartDebtOracle(_oracle)
            ? _dexData.constantViews.token0
            : _dexData.constantViews.token1;

        (uint256 quoteTokensPerShare, ) = IDexSmartDebtOracle(_oracle).dexSmartDebtSharesRates();

        dexBorrowData = DexBorrowData({
            dexPool: _dexData.dex,
            dexId: _dexData.constantViews.dexId,
            fee: _dexData.configs.fee,
            lastStoredPrice: _dexData.dexState.lastStoredPrice,
            centerPrice: _dexData.dexState.centerPrice,
            token0Utilization: _dexData.limitsAndAvailability.liquidityTokenData0.lastStoredUtilization,
            token1Utilization: _dexData.limitsAndAvailability.liquidityTokenData1.lastStoredUtilization,
            totalBorrowShares: _dexData.dexState.totalBorrowShares,
            maxBorrowShares: _dexData.configs.maxBorrowShares,
            token0Borrowed: _dexData.dexState.totalBorrowShares * _dexData.dexState.token0PerBorrowShare / 1e18,
            token1Borrowed: _dexData.dexState.totalBorrowShares * _dexData.dexState.token1PerBorrowShare / 1e18,
            sharesBorrowable: _sharesBorrowable,
            token0Borrowable: _sharesBorrowable * _dexData.dexState.token0PerBorrowShare / 1e18,
            token1Borrowable: _sharesBorrowable * _dexData.dexState.token1PerBorrowShare / 1e18,
            token0PerBorrowShare: _dexData.dexState.token0PerBorrowShare,
            token1PerBorrowShare: _dexData.dexState.token1PerBorrowShare,
            token0BorrowRate: _dexData.limitsAndAvailability.liquidityTokenData0.borrowRate,
            token1BorrowRate: _dexData.limitsAndAvailability.liquidityTokenData1.borrowRate,
            quoteToken: quoteToken,
            quoteTokensPerShare: quoteTokensPerShare
        });
    }

    /// @notice Helper function to get information whether the quote token is token0 or token1 in smart collateral dex oracle
    function _isQuoteInToken0ForSmartCollOracle(
        address _oracle
    ) internal view returns (bool quoteInToken0) {
        // Try to call the newer function signature first
        try IDexSmartCollOracle(_oracle).dexOracleData() returns (
            address, bool _quoteInToken0, address, uint256, uint256
        ) {
            return _quoteInToken0;
        } catch {
            // If the newer function fails, try the older function signature
            (,,,,,,,,, quoteInToken0) = IDexSmartCollOracle(_oracle).dexSmartColOracleData();
        }
    }

    /// @notice Helper function to get information whether the quote token is token0 or token1 in smart debt dex oracle
    function _isQuoteInToken0ForSmartDebtOracle(
        address _oracle
    ) internal view returns (bool quoteInToken0) {
        // Try to call the newer function signature first
        try IDexSmartDebtOracle(_oracle).dexOracleData() returns (
            address, bool _quoteInToken0, address, uint256, uint256
        ) {
            return _quoteInToken0;
        } catch {
            // If the newer function fails, try the older function signature
            (,,,,,,,,, quoteInToken0) = IDexSmartDebtOracle(_oracle).dexSmartDebtOracleData();
        }
    }

    /// @notice Helper function to filter FTokenDetails to FTokenData
    function _filterFTokenData(
        IFluidLendingResolver.FTokenDetails memory _details
    ) internal pure returns (FTokenData memory fTokenData) {
        fTokenData = FTokenData({
            tokenAddress: _details.tokenAddress,
            isNativeUnderlying: _details.isNativeUnderlying,
            name: _details.name,
            symbol: _details.symbol,
            decimals: _details.decimals,
            asset: _details.asset,
            totalAssets: _details.totalAssets,
            totalSupply: _details.totalSupply,
            convertToShares: _details.convertToShares,
            convertToAssets: _details.convertToAssets,
            rewardsRate: _details.rewardsRate,
            supplyRate: _details.supplyRate,
            withdrawable: _details.liquidityUserSupplyData.withdrawable,
            modeWithInterest: _details.liquidityUserSupplyData.modeWithInterest,
            expandPercent: _details.liquidityUserSupplyData.expandPercent,
            expandDuration: _details.liquidityUserSupplyData.expandDuration
        });
    }
}