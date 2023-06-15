// SPDX-Licence-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../interfaces/curveusd/ICurveUsd.sol";
import "../interfaces/IERC20.sol";

contract CurveusdView {
  struct Band {
    int256 id;
    uint256 lowPrice;
    uint256 highPrice;
    uint256 collAmount;
    uint256 debtAmount;
  }

  struct CreateLoanData {
    int256 health;
    uint256 minColl;
    uint256 maxBorr;
    Band[] bands;
  }

  struct GlobalData {
    address collateral;
    uint256 decimals;
    int256 activeBand;
    uint256 A;
    uint256 totalDebt;
    uint256 ammPrice;
    uint256 basePrice;
    uint256 oraclePrice;
    uint256 minted;
    uint256 redeemed;
    int256 sigma;
    uint256 rate;
    uint256 rate0;
    uint256 targetDebtFraction;
  }

  struct UserData {
    uint256 marketCollateralAmount;
    uint256 curveUsdCollateralAmount;
    uint256 debtAmount;
    uint256 N;
    uint256 priceLow;
    uint256 priceHigh;
    uint256 liquidationDiscount;
    int256 health;
  }

  function userData(address market, address user) external view returns (UserData memory) {
      ICrvUsdController ctrl = ICrvUsdController(market);
      IAGG agg = IAGG(ctrl.monetary_policy());
      ILLAMMA amm = ILLAMMA(ctrl.amm());
      uint256[4] memory amounts = ctrl.user_state(user);
      uint256[2] memory prices = ctrl.user_prices(user);

      return UserData(
        amounts[0],
        amounts[1],
        amounts[2],
        amounts[3],
        prices[0],
        prices[1],
        ctrl.liquidation_discount(),
        ctrl.health(user)
      );
  }

  function globalData(address market) external view returns (GlobalData memory) {
      ICrvUsdController ctrl = ICrvUsdController(market);
      IAGG agg = IAGG(ctrl.monetary_policy());
      ILLAMMA amm = ILLAMMA(ctrl.amm());
      address ct = ctrl.collateral_token();
      return GlobalData(
        ct,
        IERC20(ct).decimals(),
        amm.active_band(),
        amm.A(),
        ctrl.total_debt(),
        ctrl.amm_price(),
        amm.base_price(),
        amm.oracle_price(),
        ctrl.minted(),
        ctrl.redeemed(),
        agg.sigma(),
        agg.rate(),
        agg.rate0(),
        agg.target_debt_fraction()
    );
  }

  function createLoanData(address market, uint256 collateral, uint256 debt, uint256 N) external view returns (CreateLoanData memory) {
    ICrvUsdController ctrl = ICrvUsdController(market);
    ILLAMMA lama = ILLAMMA(ctrl.amm());

    int256 health = ctrl.health_calculator(address(0x00), int256(collateral), int256(debt), true, N);
    uint256 minColl = ctrl.min_collateral(debt, N);
    uint256 maxBorr = ctrl.max_borrowable(collateral, N);

    int256 n1 = ctrl.calculate_debt_n1(collateral, debt, N);
    int256 n2 = n1 + int256(N) - 1;

    Band[] memory bands = new Band[](N);

    for (int256 i = n1; i <= n2; i++) {
        bands[uint256(i-n1)] = Band(i, lama.p_oracle_down(i), lama.p_oracle_up(i), lama.bands_x(i), lama.bands_y(i));
    }

    return CreateLoanData(
      health,
      minColl,
      maxBorr,
      bands
    );
  }
}
