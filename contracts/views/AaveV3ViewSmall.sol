// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AaveV3Helper } from "../actions/aaveV3/helpers/AaveV3Helper.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { IPoolV3 } from "../interfaces/aaveV3/IPoolV3.sol";
import { DataTypes } from "../interfaces/aaveV3/DataTypes.sol";


contract AaveV3ViewSmall is AaveV3Helper {
    using TokenUtils for address;

    struct MiniUserPositionData {
        address[] tokenAddresses;
        uint256[] supplyAmounts;
        uint256[] borrowAmounts;
        bool[] isCollateral;
        uint256 currentEmodeId;
    }

    function getMiniUserPositionData(address _market, address _user) public view returns (MiniUserPositionData memory data) {
        IPoolV3 lendingPool = getLendingPool(_market);

        data.tokenAddresses = lendingPool.getReservesList();
        data.supplyAmounts = new uint256[](data.tokenAddresses.length);
        data.borrowAmounts = new uint256[](data.tokenAddresses.length);
        data.isCollateral = new bool[](data.tokenAddresses.length);
        data.currentEmodeId = lendingPool.getUserEMode(_user);

        for (uint256 i = 0; i < data.tokenAddresses.length; i++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(data.tokenAddresses[i]);
            data.supplyAmounts[i] = reserveData.aTokenAddress.getBalance(_user);
            data.borrowAmounts[i] = reserveData.variableDebtTokenAddress.getBalance(_user);
            data.isCollateral[i] = isUsingAsCollateral(lendingPool.getUserConfiguration(_user), reserveData.id);
        }
    }

    /// @notice Checks if a reserve is used as collateral
    /// @param self The user configuration
    /// @param reserveIndex Index of the reserve
    /// @return isUsingAsCollateral True if the reserve is used as collateral
    function isUsingAsCollateral(DataTypes.UserConfigurationMap memory self, uint256 reserveIndex)
        internal
        pure
        returns (bool)
    {
        unchecked {
            return (self.data >> ((reserveIndex << 1) + 1)) & 1 != 0;
        }
    }
}