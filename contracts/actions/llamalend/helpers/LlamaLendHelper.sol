// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./MainnetLlamaLendAddresses.sol";
import "../../../interfaces/llamalend/ILlamaLendController.sol";
import "../../../interfaces/llamalend/ILLAMA.sol";
import "../../../interfaces/llamalend/IAGG.sol";
import "../../../interfaces/IERC20.sol";
import "../../../DS/DSMath.sol";

contract LlamaLendHelper is MainnetLlamaLendAddresses, DSMath {
    function getCollateralRatio(address _user, address _controllerAddr) public view returns (uint256 collRatio, bool isInSoftLiquidation) {
        // fetch users debt
        uint256 debt = ILlamaLendController(_controllerAddr).debt(_user);
        // no position can exist without debt
        if (debt == 0) return (0, false);
        (uint256 debtAssetCollAmount, uint256 collAmount) = getCollAmountsFromAMM(_controllerAddr, _user);
        // if user has debt asset as coll he is currently underwater
        if (debtAssetCollAmount > 0) isInSoftLiquidation = true;

        // fetch collToken oracle price
        address amm = ILlamaLendController(_controllerAddr).amm();
        uint256 oraclePrice = ILLAMMA(amm).price_oracle();
        // calculate collAmount as WAD (18 decimals)
        address collToken = ILlamaLendController(_controllerAddr).collateral_token();
        uint256 assetDec = IERC20(collToken).decimals();
        uint256 collAmountWAD = assetDec > 18 ? (collAmount / 10 ** (assetDec - 18)) : (collAmount * 10 ** (18 - assetDec));
        
        collRatio = wdiv(wmul(collAmountWAD, oraclePrice) + debtAssetCollAmount, debt);
    }

    function userMaxWithdraw(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 maxWithdraw) {
        uint256[4] memory userState = ILlamaLendController(_controllerAddress).user_state(_user);
        return
            userState[0] -
            ILlamaLendController(_controllerAddress).min_collateral(userState[2], userState[3]);
    }

    function getCollAmountsFromAMM(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 debtAssetCollAmount, uint256 collAssetCollAmount) {
        address llammaAddress = ILlamaLendController(_controllerAddress).amm();
        uint256[2] memory xy = ILLAMMA(llammaAddress).get_sum_xy(_user);
        debtAssetCollAmount = xy[0];
        collAssetCollAmount = xy[1];
    }
}