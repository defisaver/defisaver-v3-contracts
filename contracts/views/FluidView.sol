// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { FluidHelper } from "../../contracts/actions/fluid/helpers/FluidHelper.sol";

contract FluidView is FluidHelper {

    struct UserPosition {
        uint256 nftId;
        address owner;
        bool isLiquidated;
        bool isSupplyPosition;
        uint256 supply;
        uint256 borrow;
        int tick;
        uint256 tickId;
    }

    struct VaultData {
        address vault;
        uint256 vaultId;
        uint256 vaultType;
        bool isSmartColl;
        bool isSmartDebt;
        address supplyToken0; // always present
        address supplyToken1; // only used for smart collateral vaults
        address borrowToken0; // always present
        address borrowToken1; // only used for smart debt vaults
        uint16 collateralFactor; // e.g 8500 = 85%
        uint16 liquidationThreshold; // e.g 9000 = 90%
        uint16 liquidationMaxLimit;  // LML is the threshold above which 100% of your position gets liquidated instantly
        uint16 withdrawalGap; // Safety non-withdrawable amount to guarantee liquidations. E.g 500 = 5%
        uint16 liquidationPenalty; // e.g 100 = 1%, 500 = 5%
        uint16 borrowFee;
        address oracle;
        uint256 oraclePriceOperate;
        uint256 oraclePriceLiquidate;
        uint256 vaultSupplyExchangePrice;
        uint256 vaultBorrowExchangePrice;
        int supplyRateVault;
        int borrowRateVault;
        int rewardsOrFeeRateSupply;
        int rewardsOrFeeRateBorrow;
        uint256 totalPositions;

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
    }

    function getUserPositions(address _user) 
        external view returns (UserPosition[] memory positions, VaultData[] memory vaults) 
    {
        uint256[] memory nftIds = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionsNftIdOfUser(_user);

        positions = new UserPosition[](nftIds.length);
        vaults = new VaultData[](nftIds.length);

        for (uint256 i = 0; i < nftIds.length; i++) {
            (positions[i], vaults[i]) = getPositionByNftId(nftIds[i]);
        }

        return (positions, vaults);
    }

    function getVaultAddresses(uint256[] calldata _ids, bool _fetchAll) external view returns (address[] memory) {
        if (_fetchAll) {
            return IFluidVaultResolver(FLUID_VAULT_RESOLVER).getAllVaultsAddresses();
        }
        address[] memory vaults = new address[](_ids.length);
        for (uint256 i = 0; i < _ids.length; i++) {
            vaults[i] = IFluidVaultResolver(FLUID_VAULT_RESOLVER).getVaultAddress(_ids[i]);    
        }
        return vaults;
    }

    function getPositionByNftId(uint256 _nftId) public view returns (UserPosition memory position, VaultData memory vault) {
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
            tick: userPosition.tick,
            tickId: userPosition.tickId
        });

        vault = getVaultData(vaultData.vault);
    }

    function getVaultData(address _vault) public view returns (VaultData memory vaultData) {
        IFluidVaultResolver.VaultEntireData memory data = 
            IFluidVaultResolver(FLUID_VAULT_RESOLVER).getVaultEntireData(_vault);

        vaultData = VaultData({
            vault: _vault,
            vaultId: data.constantVariables.vaultId,
            vaultType: data.constantVariables.vaultType,
            isSmartColl: data.isSmartCol,
            isSmartDebt: data.isSmartDebt,
            supplyToken0: data.constantVariables.supplyToken.token0,
            supplyToken1: data.constantVariables.supplyToken.token1,
            borrowToken0: data.constantVariables.borrowToken.token0,
            borrowToken1: data.constantVariables.borrowToken.token1,

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

            minimumBorrowing: data.limitsAndAvailability.minimumBorrowing
        });
    }
}