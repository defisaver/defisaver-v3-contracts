// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ILendingPoolV2 } from "../../../interfaces/aaveV2/ILendingPoolV2.sol";
import { ILendingPoolAddressesProviderV2 } from "../../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import { DSMath } from "../../../DS/DSMath.sol";
import { MainnetAaveAddresses } from "./MainnetAaveAddresses.sol";

contract AaveRatioHelper is DSMath, MainnetAaveAddresses {

    function getSafetyRatio(address _market, address _user) public view returns(uint256) {
        ILendingPoolV2 lendingPool = ILendingPoolV2(ILendingPoolAddressesProviderV2(_market).getLendingPool());
        
        (,uint256 totalDebtETH,uint256 availableBorrowsETH,,,) = lendingPool.getUserAccountData(_user);

        if (totalDebtETH == 0) return uint256(0);

        return wdiv(add(totalDebtETH, availableBorrowsETH), totalDebtETH);
    }
}