// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../DS/DSMath.sol";
import "./MainnetSparkAddresses.sol";
import "../../../interfaces/aaveV3/IPoolV3.sol";

contract SparkRatioHelper is DSMath, MainnetSparkAddresses {

    /// @notice Calculated the ratio of coll * weighted ltv / debt for spark user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
   function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(_market).getPool());
        (uint256 totalCollUSD, uint256 totalDebtUSD, , , uint256 ltv, ) = lendingPool
            .getUserAccountData(_user);
        if (totalDebtUSD == 0) return 0;
        /// @dev we're multiplying ltv with 10**14 so it represents number with 18 decimals (since 0 < ltv < 10000)
        return wdiv(wmul(totalCollUSD, ltv * 10**14), totalDebtUSD);
    }
}