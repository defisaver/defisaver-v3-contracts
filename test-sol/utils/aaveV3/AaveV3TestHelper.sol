// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IPoolV3 } from "../../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { DataTypes } from "../../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";
import { ReserveConfiguration } from "../../../contracts/_vendor/aave/v3/ReserveConfiguration.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

contract AaveV3TestHelper is AaveV3Helper {
    using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

    function isValidSupply(address _market, address _token, uint256 _amount)
        public
        view
        returns (bool)
    {
        if (_amount == 0) return false;

        IPoolV3 lendingPool = getLendingPool(_market);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_token);

        // Check flags
        (bool isActive, bool isFrozen,, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isFrozen) return false;
        if (isPaused) return false;

        // Check cap
        uint256 supplyCap = config.getSupplyCap() * (10 ** config.getDecimals());
        uint256 aTokenTotalSupply = IERC20(lendingPool.getReserveAToken(_token)).totalSupply();
        if (supplyCap != 0 && supplyCap < aTokenTotalSupply + _amount) return false;

        return true;
    }

    function isValidBorrow(address _market, address _token, uint256 _amount)
        public
        view
        returns (bool)
    {
        if (_amount == 0) return false;

        IPoolV3 lendingPool = getLendingPool(_market);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_token);

        // Check flags
        (bool isActive, bool isFrozen, bool isBorrowingEnabled, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isFrozen) return false;
        if (isPaused) return false;
        if (!isBorrowingEnabled) return false;

        // Check cap
        uint256 borrowCap = config.getBorrowCap() * (10 ** config.getDecimals());
        uint256 totalBorrow = IERC20(lendingPool.getReserveVariableDebtToken(_token)).totalSupply();
        if (borrowCap != 0 && borrowCap < totalBorrow + _amount) return false;

        // Check liquidity
        uint256 liquidity = IERC20(_token).balanceOf(lendingPool.getReserveAToken(_token));
        if (liquidity < _amount) return false;

        return true;
    }

    function isValidWithdraw(address _market, address _token, uint256 _amount)
        public
        view
        returns (bool)
    {
        if (_amount == 0) return false;

        IPoolV3 lendingPool = getLendingPool(_market);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_token);

        // Check flags
        (bool isActive,,, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isPaused) return false;

        // Check liquidity
        uint256 liquidity = IERC20(_token).balanceOf(lendingPool.getReserveAToken(_token));
        if (liquidity < _amount) return false;

        return true;
    }

    function isValidRepay(address _market, address _token) public view returns (bool) {
        IPoolV3 lendingPool = getLendingPool(_market);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_token);

        // Check flags
        (bool isActive,,, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isPaused) return false;

        return true;
    }

    function isValidSetAsCollateral(address _market, address _token) public view returns (bool) {
        IPoolV3 lendingPool = getLendingPool(_market);
        DataTypes.ReserveConfigurationMap memory config = lendingPool.getConfiguration(_token);

        // Check flags
        (bool isActive,,, bool isPaused) = config.getFlags();
        if (!isActive) return false;
        if (isPaused) return false;

        return true;
    }
}
