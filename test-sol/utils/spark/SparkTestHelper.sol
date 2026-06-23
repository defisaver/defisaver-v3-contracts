// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { ISparkPool } from "../../../contracts/interfaces/protocols/spark/ISparkPool.sol";
import { SparkDataTypes } from "../../../contracts/interfaces/protocols/spark/SparkDataTypes.sol";
import { DataTypes } from "../../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";
import { ReserveConfiguration } from "../../../contracts/_vendor/aave/v3/ReserveConfiguration.sol";
import { SparkHelper } from "../../../contracts/actions/spark/helpers/SparkHelper.sol";

contract SparkTestHelper is SparkHelper {
    using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

    function isValidSupply(address _market, address _token, uint256 _amount)
        public
        view
        returns (bool)
    {
        if (_amount == 0) return false;

        ISparkPool lendingPool = getSparkLendingPool(_market);
        SparkDataTypes.ReserveData memory reserve = lendingPool.getReserveData(_token);
        DataTypes.ReserveConfigurationMap memory config;
        config.data = reserve.configuration.data;

        (bool isActive, bool isFrozen,, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isFrozen) return false;
        if (isPaused) return false;

        uint256 supplyCap = config.getSupplyCap() * (10 ** config.getDecimals());
        uint256 aTokenTotalSupply = IERC20(reserve.aTokenAddress).totalSupply();
        if (supplyCap != 0 && supplyCap < aTokenTotalSupply + _amount) return false;

        return true;
    }

    function isValidBorrow(address _market, address _token, uint256 _amount)
        public
        view
        returns (bool)
    {
        if (_amount == 0) return false;

        ISparkPool lendingPool = getSparkLendingPool(_market);
        SparkDataTypes.ReserveData memory reserve = lendingPool.getReserveData(_token);
        DataTypes.ReserveConfigurationMap memory config;
        config.data = reserve.configuration.data;

        (bool isActive, bool isFrozen, bool isBorrowingEnabled, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isFrozen) return false;
        if (isPaused) return false;
        if (!isBorrowingEnabled) return false;

        uint256 borrowCap = config.getBorrowCap() * (10 ** config.getDecimals());
        uint256 totalBorrow = IERC20(reserve.variableDebtTokenAddress).totalSupply();
        if (borrowCap != 0 && borrowCap < totalBorrow + _amount) return false;

        uint256 liquidity = IERC20(_token).balanceOf(reserve.aTokenAddress);
        if (liquidity < _amount) return false;

        return true;
    }

    function isValidRepay(address _market, address _token) public view returns (bool) {
        ISparkPool lendingPool = getSparkLendingPool(_market);
        SparkDataTypes.ReserveData memory reserve = lendingPool.getReserveData(_token);
        DataTypes.ReserveConfigurationMap memory config;
        config.data = reserve.configuration.data;

        (bool isActive,,, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isPaused) return false;

        return true;
    }
}
