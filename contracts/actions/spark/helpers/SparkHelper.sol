// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MainnetSparkAddresses } from "./MainnetSparkAddresses.sol";

import { ISparkPool } from "../../../interfaces/spark/ISparkPool.sol";
import { ISparkProtocolDataProvider } from "../../../interfaces/spark/ISparkProtocolDataProvider.sol";
import { ISparkPoolAddressesProvider } from "../../../interfaces/spark/ISparkPoolAddressesProvider.sol";

/// @title Utility functions and data used in Spark actions
contract SparkHelper is MainnetSparkAddresses {
    
    uint16 public constant SPARK_REFERRAL_CODE = 0;
    
    
    /// @notice Returns the lending pool contract of the specified market
    function getSparkLendingPool(address _market) internal view returns (ISparkPool) {
        return ISparkPool(ISparkPoolAddressesProvider(_market).getPool());
    }

    /// @notice Fetch the data provider for the specified market
    function getSparkDataProvider(address _market) internal view returns (ISparkProtocolDataProvider) {
        return
            ISparkProtocolDataProvider(
                ISparkPoolAddressesProvider(_market).getPoolDataProvider()
            );
    }

    function getSparkWholeDebt(address _market, address _tokenAddr, uint256 _borrowType, address _debtOwner) internal view returns (uint256 debt) {
        uint256 STABLE_ID = 1;
        uint256 VARIABLE_ID = 2;
        
        ISparkProtocolDataProvider dataProvider = getSparkDataProvider(_market);
        (, uint256 borrowsStable, uint256 borrowsVariable, , , , , , ) =
            dataProvider.getUserReserveData(_tokenAddr, _debtOwner);

        if (_borrowType == STABLE_ID) {
            debt = borrowsStable;
        } else if (_borrowType == VARIABLE_ID) {
            debt = borrowsVariable;
        }
    }
}