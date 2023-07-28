// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../../DS/DSMath.sol";

contract AaveRatioHelper is DSMath {

    address internal constant TRANSIENT_STORAGE = 0x2F7Ef2ea5E8c97B8687CA703A0e50Aa5a49B7eb2;
    address internal constant DEFAULT_AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    function getSafetyRatio(address _market, address _user) public view returns(uint256) {
        ILendingPoolV2 lendingPool = ILendingPoolV2(ILendingPoolAddressesProviderV2(_market).getLendingPool());
        
        (,uint256 totalDebtETH,uint256 availableBorrowsETH,,,) = lendingPool.getUserAccountData(_user);

        if (totalDebtETH == 0) return uint256(0);

        return wdiv(add(totalDebtETH, availableBorrowsETH), totalDebtETH);
    }
}