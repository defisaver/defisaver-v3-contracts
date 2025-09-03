// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DSMath } from "../../../DS/DSMath.sol";
import { MainnetAaveV3Addresses } from "./MainnetAaveV3Addresses.sol";
import { IPoolV3 } from "../../../interfaces/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../../../interfaces/aaveV3/IPoolAddressesProvider.sol";

contract AaveV3RatioHelper is DSMath, MainnetAaveV3Addresses {
   function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(_market).getPool());
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