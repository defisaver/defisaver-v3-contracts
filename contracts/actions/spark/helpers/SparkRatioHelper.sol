// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {
    ISparkPoolAddressesProvider
} from "../../../interfaces/protocols/spark/ISparkPoolAddressesProvider.sol";
import { ISparkPool } from "../../../interfaces/protocols/spark/ISparkPool.sol";
import { ISparkV3Oracle } from "../../../interfaces/protocols/spark/ISparkV3Oracle.sol";
import { SparkDataTypes } from "../../../interfaces/protocols/spark/SparkDataTypes.sol";
import { ReserveConfiguration } from "../../../_vendor/spark/ReserveConfiguration.sol";
import { UserConfiguration } from "../../../_vendor/spark/UserConfiguration.sol";
import { PercentageMath } from "../../../_vendor/spark/PercentageMath.sol";
import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { MainnetSparkAddresses } from "./MainnetSparkAddresses.sol";

contract SparkRatioHelper is DSMath, MainnetSparkAddresses {
    using TokenUtils for address;
    using UserConfiguration for SparkDataTypes.UserConfigurationMap;
    using ReserveConfiguration for SparkDataTypes.ReserveConfigurationMap;
    using PercentageMath for uint256;

    /// @notice The offset to use when the ltv is 0. In that case, we fallback to lltv - LTV_ZERO_OFFSET
    /// @dev Some reserves will have higher or lower difference between ltv and lltv,
    /// which is ok as this is a fallback approximation value.
    uint256 public constant LTV_ZERO_OFFSET = 500;

    struct CalculateUserAccountDataVars {
        uint256 i;
        address[] reserveList;
        address currentReserveAddress;
        uint256 ltv;
        uint256 liquidationThreshold;
        uint256 decimals;
        uint256 assetPrice;
        uint256 assetUnit;
        ISparkV3Oracle oracle;
        uint256 userBalanceInBaseCurrency;
        uint256 userTotalDebtInAsset;
        bool isInEModeCategory;
        uint256 userEModeCategory;
        uint256 eModeAssetPrice;
        uint256 eModeLtv;
        uint256 eModeLiqThreshold;
        uint256 eModeAssetCategory;
    }

    /// @notice Returns the safety ratio of the user:
    /// the current overall health of position, inversely proportional to borrow power used.
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return The safety ratio of the user
    function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        ISparkPool lendingPool = ISparkPool(ISparkPoolAddressesProvider(_market).getPool());
        (, uint256 totalDebtValue, uint256 availableBorrows,,,) =
            lendingPool.getUserAccountData(_user);
        if (totalDebtValue == 0) return uint256(0);
        return wdiv(totalDebtValue + availableBorrows, totalDebtValue);
    }

    /// @notice Returns the safety ratio of the user with ltv zero fallback support
    ///         the current overall health of position, inversely proportional to borrow power used.
    ///         This function is equivalent to getSafetyRatio, but when asset has ltv zero, we fallback to lltv - LTV_ZERO_OFFSET.
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return The safety ratio of the user with ltv zero fallback support
    /// @dev Spark LTV-zero collateral has no borrow power but still contributes to liquidation threshold / HF.
    ///      For automation flows that historically rely on safety ratio, this function approximates
    ///      LTV-zero collateral contribution as liquidationThreshold - 5%.
    ///      This is NOT equal to Spark available borrow power and should not be used to determine
    ///      whether new debt can be opened.
    function getSafetyRatioWithLtvZeroFallback(address _market, address _user)
        public
        view
        returns (uint256)
    {
        (uint256 totalCollateralValue, uint256 totalDebtValue, uint256 avgLtv) =
            _getUserAccountDataWithLtvZeroFallback(_market, _user);

        if (totalDebtValue == 0) return uint256(0);

        uint256 availableBorrowValue =
            _calculateAvailableBorrowValue(totalCollateralValue, totalDebtValue, avgLtv);

        return wdiv(add(totalDebtValue, availableBorrowValue), totalDebtValue);
    }

    /// @dev Same as getSafetyRatio, left for convenience and backward compatibility.
    function getRatio(address _market, address _user) public view returns (uint256) {
        return getSafetyRatio(_market, _user);
    }

    /*//////////////////////////////////////////////////////////////
                               HELPERS
    //////////////////////////////////////////////////////////////*/
    function _calculateAvailableBorrowValue(
        uint256 _totalCollateralValue,
        uint256 _totalDebtValue,
        uint256 _avgLtv
    ) internal pure returns (uint256) {
        uint256 totalAvailableBorrowValue = _totalCollateralValue.percentMul(_avgLtv);
        if (totalAvailableBorrowValue <= _totalDebtValue) return 0;
        return totalAvailableBorrowValue - _totalDebtValue;
    }

    /// @dev See: https://github.com/aave/aave-v3-core/blob/master/contracts/protocol/libraries/logic/GenericLogic.sol#L64
    function _getUserAccountDataWithLtvZeroFallback(address _market, address _user)
        internal
        view
        returns (uint256 totalCollateralValue, uint256 totalDebtValue, uint256 avgLtv)
    {
        ISparkPool lendingPool = ISparkPool(ISparkPoolAddressesProvider(_market).getPool());
        SparkDataTypes.UserConfigurationMap memory userCfg = lendingPool.getUserConfiguration(_user);
        if (userCfg.isEmpty()) return (0, 0, 0);

        CalculateUserAccountDataVars memory vars;

        vars.reserveList = lendingPool.getReservesList();
        vars.oracle = ISparkV3Oracle(ISparkPoolAddressesProvider(_market).getPriceOracle());
        vars.userEModeCategory = lendingPool.getUserEMode(_user);

        if (vars.userEModeCategory != 0) {
            SparkDataTypes.EModeCategory memory eModeCategory =
                lendingPool.getEModeCategoryData(uint8(vars.userEModeCategory));
            vars.eModeLtv = eModeCategory.ltv;
            vars.eModeLiqThreshold = eModeCategory.liquidationThreshold;
            if (eModeCategory.priceSource != address(0)) {
                vars.eModeAssetPrice = vars.oracle.getAssetPrice(eModeCategory.priceSource);
            }
        }

        while (vars.i < vars.reserveList.length) {
            if (!userCfg.isUsingAsCollateralOrBorrowing(vars.i)) {
                vars.i++;
                continue;
            }

            vars.currentReserveAddress = vars.reserveList[vars.i];

            if (vars.currentReserveAddress == address(0)) {
                vars.i++;
                continue;
            }

            SparkDataTypes.ReserveData memory currentReserve =
                lendingPool.getReserveData(vars.currentReserveAddress);

            (vars.ltv, vars.liquidationThreshold,, vars.decimals,, vars.eModeAssetCategory) =
                currentReserve.configuration.getParams();

            vars.assetUnit = 10 ** vars.decimals;
            vars.assetPrice = (vars.eModeAssetPrice != 0
                        && vars.userEModeCategory == vars.eModeAssetCategory)
                ? vars.eModeAssetPrice
                : vars.oracle.getAssetPrice(vars.currentReserveAddress);

            if (vars.liquidationThreshold != 0 && userCfg.isUsingAsCollateral(vars.i)) {
                vars.userBalanceInBaseCurrency = currentReserve.aTokenAddress.getBalance(_user)
                    * vars.assetPrice / vars.assetUnit;
                totalCollateralValue += vars.userBalanceInBaseCurrency;
                vars.isInEModeCategory = vars.userEModeCategory != 0
                    && vars.userEModeCategory == vars.eModeAssetCategory;
                if (vars.ltv != 0) {
                    avgLtv += vars.userBalanceInBaseCurrency
                    * (vars.isInEModeCategory ? vars.eModeLtv : vars.ltv);
                } else if (vars.liquidationThreshold > LTV_ZERO_OFFSET) {
                    vars.ltv = vars.liquidationThreshold - LTV_ZERO_OFFSET;
                    avgLtv += vars.userBalanceInBaseCurrency * vars.ltv;
                }
            }

            if (userCfg.isBorrowing(vars.i)) {
                vars.userTotalDebtInAsset = currentReserve.variableDebtTokenAddress
                    .getBalance(_user) + currentReserve.stableDebtTokenAddress.getBalance(_user);
                totalDebtValue += vars.userTotalDebtInAsset * vars.assetPrice / vars.assetUnit;
            }

            vars.i++;
        }

        avgLtv = (totalCollateralValue != 0) ? avgLtv / totalCollateralValue : 0;
    }

    /// @dev Helper function to check if ratio is 0, used for better readability.
    function _isRatioZero(uint256 _ratio) internal pure returns (bool) {
        return _ratio == 0;
    }
}
