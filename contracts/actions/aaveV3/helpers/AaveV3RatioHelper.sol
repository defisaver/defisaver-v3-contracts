// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IPoolV3 } from "../../../interfaces/protocols/aaveV3/IPoolV3.sol";
import {
    IPoolAddressesProvider
} from "../../../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IAaveV3Oracle } from "../../../interfaces/protocols/aaveV3/IAaveV3Oracle.sol";
import { DataTypes } from "../../../interfaces/protocols/aaveV3/DataTypes.sol";
import { UserConfiguration } from "../../../_vendor/aave/v3/UserConfiguration.sol";
import { ReserveConfiguration } from "../../../_vendor/aave/v3/ReserveConfiguration.sol";
import { PercentageMath } from "../../../_vendor/aave/v3/PercentageMath.sol";
import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { MainnetAaveV3Addresses } from "./MainnetAaveV3Addresses.sol";

contract AaveV3RatioHelper is DSMath, MainnetAaveV3Addresses {
    using TokenUtils for address;
    using UserConfiguration for DataTypes.UserConfigurationMap;
    using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
    using PercentageMath for uint256;

    /// @notice The offset to use when the ltv is 0. In that case, we fallback to lltv - LTV_ZERO_OFFSET
    /// @dev Some reserves will have higher or lower difference between ltv and lltv,
    /// which is ok as this is a fallback approximation value.
    uint256 public constant LTV_ZERO_OFFSET = 500;

    struct CalculateUserAccountDataVars {
        uint8 userEmodeId;
        IAaveV3Oracle oracle;
        uint256 i;
        uint256 cachedUserCfg;
        bool isBorrowed;
        bool isCollateral;
        address asset;
        uint256 assetUnit;
        uint256 assetPrice;
        DataTypes.ReserveData reserve;
        uint256 collateralValue;
        uint256 aTokenBalance;
        uint256 ltv;
        uint256 lltv;
        uint256 avgLtv;
        uint256 variableDebtBalance;
    }

    /// @notice Returns the safety ratio of the user:
    /// the current overall health of position, inversely proportional to borrow power used.
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return The safety ratio of the user
    function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(_market).getPool());
        (, uint256 totalDebtValue, uint256 availableBorrows,,,) =
            lendingPool.getUserAccountData(_user);
        if (totalDebtValue == 0) return uint256(0);
        return wdiv(add(totalDebtValue, availableBorrows), totalDebtValue);
    }

    /// @notice Returns the safety ratio of the user with ltv zero fallback support
    ///         the current overall health of position, inversely proportional to borrow power used.
    ///         This function is equivalent to getSafetyRatio, but when asset has ltv zero, we fallback to lltv - LTV_ZERO_OFFSET.
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    /// @return The safety ratio of the user with ltv zero fallback support
    /// @dev Aave LTV-zero collateral has no borrow power but still contributes to liquidation threshold / HF.
    ///      For automation flows that historically rely on safety ratio, this function approximates
    ///      LTV-zero collateral contribution as liquidationThreshold - 5%.
    ///      This is NOT equal to Aave available borrow power and should not be used to determine
    ///      whether new debt can be opened.
    function getSafetyRatioWithLtvZeroFallback(address _market, address _user)
        public
        view
        returns (uint256)
    {
        (uint256 totalCollateralValue, uint256 totalDebtValue, uint256 avgLtv) =
            _getUserAccountDataWithLtvZeroFallback(_market, _user);

        if (totalDebtValue == 0) return uint256(0);

        uint256 availableBorrows =
            _calculateAvailableBorrowValue(totalCollateralValue, totalDebtValue, avgLtv);

        return wdiv(add(totalDebtValue, availableBorrows), totalDebtValue);
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
        uint256 totalAvailableBorrowValue = _totalCollateralValue.percentMulFloor(_avgLtv);
        if (totalAvailableBorrowValue <= _totalDebtValue) return 0;
        return totalAvailableBorrowValue - _totalDebtValue;
    }

    /// @dev See: https://github.com/aave-dao/aave-v3-origin/blob/main/src/contracts/protocol/libraries/logic/GenericLogic.sol#L65
    function _getUserAccountDataWithLtvZeroFallback(address _market, address _user)
        internal
        view
        returns (uint256 totalCollateralValue, uint256 totalDebtValue, uint256 avgLtv)
    {
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(_market).getPool());
        DataTypes.UserConfigurationMap memory userCfg = lendingPool.getUserConfiguration(_user);
        if (userCfg.isEmpty()) return (0, 0, 0);

        CalculateUserAccountDataVars memory vars;
        vars.userEmodeId = uint8(lendingPool.getUserEMode(_user));
        vars.oracle = IAaveV3Oracle(IPoolAddressesProvider(_market).getPriceOracle());
        vars.cachedUserCfg = userCfg.data;

        while (vars.cachedUserCfg != 0) {
            (vars.cachedUserCfg, vars.isBorrowed, vars.isCollateral) =
                UserConfiguration.getNextFlags(vars.cachedUserCfg);
            if (vars.isBorrowed || vars.isCollateral) {
                vars.asset = lendingPool.getReserveAddressById(uint16(vars.i));
                if (vars.asset != address(0)) {
                    vars.reserve = lendingPool.getReserveData(vars.asset);
                    vars.assetUnit = 10 ** vars.reserve.configuration.getDecimals();
                    vars.assetPrice = vars.oracle.getAssetPrice(vars.asset);
                    if (vars.isCollateral) {
                        vars.aTokenBalance = vars.reserve.aTokenAddress.getBalance(_user);
                        vars.collateralValue =
                            (vars.aTokenBalance * vars.assetPrice) / vars.assetUnit;
                        totalCollateralValue += vars.collateralValue;
                        (vars.ltv, vars.lltv) = _getUserReserveLtvAndLltv(
                            vars.reserve, lendingPool, vars.userEmodeId
                        );
                        if (vars.ltv == 0 && vars.lltv > LTV_ZERO_OFFSET) {
                            vars.ltv = vars.lltv - LTV_ZERO_OFFSET;
                        }
                        avgLtv += vars.collateralValue * vars.ltv;
                    }
                    if (vars.isBorrowed) {
                        vars.variableDebtBalance =
                            vars.reserve.variableDebtTokenAddress.getBalance(_user);
                        totalDebtValue += (vars.variableDebtBalance * vars.assetPrice)
                        / vars.assetUnit;
                    }
                }
            }
            vars.i++;
        }
        avgLtv = (totalCollateralValue != 0) ? avgLtv / totalCollateralValue : 0;
    }

    /// @dev See: https://github.com/aave-dao/aave-v3-origin/blob/main/src/contracts/protocol/libraries/logic/ValidationLogic.sol#L524
    function _getUserReserveLtvAndLltv(
        DataTypes.ReserveData memory _reserve,
        IPoolV3 _lendingPool,
        uint8 _emodeId
    ) internal view returns (uint256 ltv, uint256 lltv) {
        if (_emodeId != 0) {
            DataTypes.CollateralConfig memory
                emodeConfig = _lendingPool.getEModeCategoryCollateralConfig(_emodeId);
            uint128 collateralBitmap = _lendingPool.getEModeCategoryCollateralBitmap(_emodeId);
            if (_isReserveEnabledOnBitmap(collateralBitmap, _reserve.id)) {
                uint128 ltvZeroBitmap = _lendingPool.getEModeCategoryLtvzeroBitmap(_emodeId);
                ltv = _isReserveEnabledOnBitmap(ltvZeroBitmap, _reserve.id) ? 0 : emodeConfig.ltv;
                lltv = emodeConfig.liquidationThreshold;
            } else {
                ltv = _lendingPool.getIsEModeCategoryIsolated(_emodeId)
                    ? 0
                    : _reserve.configuration.getLtv();
                lltv = _reserve.configuration.getLiquidationThreshold();
            }
        } else {
            ltv = _reserve.configuration.getLtv();
            lltv = _reserve.configuration.getLiquidationThreshold();
        }
    }

    function _isReserveEnabledOnBitmap(uint128 _bitmap, uint256 _reserveIndex)
        internal
        pure
        returns (bool)
    {
        unchecked {
            return (_bitmap >> _reserveIndex) & 1 != 0;
        }
    }
}
