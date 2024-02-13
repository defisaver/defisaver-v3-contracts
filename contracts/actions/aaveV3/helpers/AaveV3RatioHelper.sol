// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../DS/DSMath.sol";
import "./MainnetAaveV3Addresses.sol";
import "../../../interfaces/aaveV3/IPoolV3.sol";

contract AaveV3RatioHelper is DSMath, MainnetAaveV3Addresses {
   function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(_market).getPool());
        (uint256 totalCollUSD, uint256 totalDebtUSD, , , uint256 ltv, ) = lendingPool
            .getUserAccountData(_user);
        if (totalDebtUSD == 0) return 0;
        return wdiv(wmul(totalCollUSD, ltv * 10**14), totalDebtUSD);
    }
}