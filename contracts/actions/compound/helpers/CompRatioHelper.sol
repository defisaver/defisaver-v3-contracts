// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { ICompoundOracle } from "../../../interfaces/protocols/compound/ICompoundOracle.sol";
import { IComptroller } from "../../../interfaces/protocols/compound/IComptroller.sol";
import { ICToken } from "../../../interfaces/protocols/compound/ICToken.sol";
import { Exponential } from "../../../_vendor/compound/Exponential.sol";
import { MainnetCompAddresses } from "./MainnetCompAddresses.sol";

contract CompRatioHelper is Exponential, DSMath, MainnetCompAddresses {
    // solhint-disable-next-line const-name-snakecase
    IComptroller public constant comp = IComptroller(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);

    /// @notice Calculated the ratio of debt / adjusted collateral
    /// @param _user Address of the user
    function getSafetyRatio(address _user) public view returns (uint256) {
        // For each asset the account is in
        address[] memory assets = comp.getAssetsIn(_user);
        address oracleAddr = comp.oracle();

        uint256 sumCollateral = 0;
        uint256 sumBorrow = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];

            (, uint256 cTokenBalance, uint256 borrowBalance, uint256 exchangeRateMantissa) =
                ICToken(asset).getAccountSnapshot(_user);

            Exp memory oraclePrice;

            if (cTokenBalance != 0 || borrowBalance != 0) {
                oraclePrice =
                    Exp({ mantissa: ICompoundOracle(oracleAddr).getUnderlyingPrice(asset) });
            }

            // Sum up collateral in Usd
            if (cTokenBalance != 0) {
                (, uint256 collFactorMantissa) = comp.markets(address(asset));

                Exp memory collateralFactor = Exp({ mantissa: collFactorMantissa });
                Exp memory exchangeRate = Exp({ mantissa: exchangeRateMantissa });

                (, Exp memory tokensToUsd) = mulExp3(collateralFactor, exchangeRate, oraclePrice);

                (, sumCollateral) =
                    mulScalarTruncateAddUInt(tokensToUsd, cTokenBalance, sumCollateral);
            }

            // Sum up debt in Usd
            if (borrowBalance != 0) {
                (, sumBorrow) = mulScalarTruncateAddUInt(oraclePrice, borrowBalance, sumBorrow);
            }
        }

        if (sumBorrow == 0) return 0;

        uint256 borrowPowerUsed = (sumBorrow * 10 ** 18) / sumCollateral;
        return wdiv(1e18, borrowPowerUsed);
    }
}
