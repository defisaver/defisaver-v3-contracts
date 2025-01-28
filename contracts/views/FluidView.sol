// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { FluidHelper } from "../../contracts/actions/fluid/helpers/FluidHelper.sol";
import { TokenPriceHelper } from "../utils/TokenPriceHelper.sol";
import { IERC20 } from "../interfaces/IERC20.sol";

contract FluidView is FluidHelper, TokenPriceHelper {

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
        uint16 borrowFee;
        address oracle; // address of the oracle
        uint256 oraclePriceOperate;
        uint256 oraclePriceLiquidate;
        uint256 priceOfSupplyToken0InUSD; // Price of the collateral token 0 in USD. Scaled by 1e8
        uint256 priceOfSupplyToken1InUSD; // Price of the collateral token 1 in USD. Scaled by 1e8. 0 if not present
        uint256 priceOfBorrowToken0InUSD; // Price of the debt token 0 in USD. Scaled by 1e8
        uint256 priceOfBorrowToken1InUSD; // Price of the debt token 1 in USD. Scaled by 1e8. 0 if not present
        uint256 vaultSupplyExchangePrice;
        uint256 vaultBorrowExchangePrice;
        int supplyRateVault;
        int borrowRateVault;
        int rewardsOrFeeRateSupply;
        int rewardsOrFeeRateBorrow;
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

        address supplyToken0 = data.constantVariables.supplyToken.token0;
        address supplyToken1 = data.constantVariables.supplyToken.token1;
        address borrowToken0 = data.constantVariables.borrowToken.token0;
        address borrowToken1 = data.constantVariables.borrowToken.token1;

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
            priceOfSupplyToken0InUSD: getPriceInUSD(data.constantVariables.supplyToken.token0),
            priceOfSupplyToken1InUSD: supplyToken1 != address(0) ? getPriceInUSD(data.constantVariables.supplyToken.token1) : 0,
            priceOfBorrowToken0InUSD: getPriceInUSD(data.constantVariables.borrowToken.token0),
            priceOfBorrowToken1InUSD: borrowToken1 != address(0) ? getPriceInUSD(data.constantVariables.borrowToken.token1) : 0,

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