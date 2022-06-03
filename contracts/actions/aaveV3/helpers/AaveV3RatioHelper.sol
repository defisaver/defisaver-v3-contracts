// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./OptimismAaveV3Addresses.sol";

import "../../../DS/DSMath.sol";
import "../../../interfaces/aaveV3/IL2PoolV3.sol";
import "../../../interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import "../../../interfaces/aaveV3/IPoolAddressesProvider.sol";

contract AaveV3RatioHelper is DSMath, OptimismAaveV3Addresses {

   function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IPoolV3 lendingPool = IL2PoolV3(IPoolAddressesProvider(_market).getPool());

        (, uint256 totalDebtETH, uint256 availableBorrowsETH, , , ) = lendingPool
            .getUserAccountData(_user);

        if (totalDebtETH == 0) return uint256(0);

        return wdiv(totalDebtETH + availableBorrowsETH, totalDebtETH);
    }

    /// @notice Calculated the ratio of coll/debt for an aave user
    /// @param _market Address of LendingPoolAddressesProvider for specific market
    /// @param _user Address of the user
    function getRatio(address _market, address _user) public view returns (uint256) {
        // For each asset the account is in
        return getSafetyRatio(_market, _user);
    }
}