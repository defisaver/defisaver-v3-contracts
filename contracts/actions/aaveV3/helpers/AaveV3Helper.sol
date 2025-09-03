// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IL2PoolV3 } from "../../../interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { IPoolAddressesProvider } from "../../../interfaces/aaveV3/IPoolAddressesProvider.sol";
import { MainnetAaveV3Addresses } from "./MainnetAaveV3Addresses.sol";

/// @title Utility functions and data used in AaveV3 actions
contract AaveV3Helper is MainnetAaveV3Addresses {
    
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    /// @notice Returns the lending pool contract of the specified market
    function getLendingPool(address _market) internal view returns (IL2PoolV3) {
        return IL2PoolV3(IPoolAddressesProvider(_market).getPool());
    }

    /// @notice Fetch the data provider for the specified market
    function getDataProvider(address _market) internal view returns (IAaveProtocolDataProvider) {
        return
            IAaveProtocolDataProvider(
                IPoolAddressesProvider(_market).getPoolDataProvider()
            );
    }

    function getWholeDebt(address _market, address _tokenAddr, uint256 _borrowType, address _debtOwner) internal view returns (uint256 debt) {
        uint256 STABLE_ID = 1;
        uint256 VARIABLE_ID = 2;

        IAaveProtocolDataProvider dataProvider = getDataProvider(_market);
        (, uint256 borrowsStable, uint256 borrowsVariable, , , , , , ) =
            dataProvider.getUserReserveData(_tokenAddr, _debtOwner);

        if (_borrowType == STABLE_ID) {
            debt = borrowsStable;
        } else if (_borrowType == VARIABLE_ID) {
            debt = borrowsVariable;
        }
    }
}