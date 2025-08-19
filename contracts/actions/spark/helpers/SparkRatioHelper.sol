// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DSMath } from "../../../DS/DSMath.sol";
import { MainnetSparkAddresses } from "./MainnetSparkAddresses.sol";
import { ISparkPool } from "../../../interfaces/spark/ISparkPool.sol";
import { ISparkPoolAddressesProvider } from "../../../interfaces/spark/ISparkPoolAddressesProvider.sol";

contract SparkRatioHelper is DSMath, MainnetSparkAddresses {
   function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        ISparkPool lendingPool = ISparkPool(ISparkPoolAddressesProvider(_market).getPool());
        (, uint256 totalDebtETH, uint256 availableBorrowsETH, , , ) = lendingPool
            .getUserAccountData(_user);
        if (totalDebtETH == 0) return uint256(0);
        return wdiv(totalDebtETH + availableBorrowsETH, totalDebtETH);
    }
    /// @notice Calculated the ratio of coll/debt for an spark user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    function getRatio(address _market, address _user) public view returns (uint256) {
        // For each asset the account is in
        return getSafetyRatio(_market, _user);
    }
}