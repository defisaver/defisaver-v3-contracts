// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../actions/llamalend/helpers/LlamaLendHelper.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC4626.sol";
import "../interfaces/llamalend/ILlamaLendVault.sol";

contract LlamaLendView is LlamaLendHelper {
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
    uint256 maxBorrow;
    Band[] bands;
  }

  struct GlobalData {
    address collateralToken;
    address debtToken;
    uint256 decimals;
    int256 activeBand;
    uint256 A;
    uint256 totalDebt;
    uint256 ammPrice;
    uint256 basePrice;
    uint256 oraclePrice;
    uint256 minted;
    uint256 redeemed;
    uint256 monetaryPolicyRate;
    uint256 ammRate;
    int256 minBand;
    int256 maxBand;
    uint256 borrowApr;
    uint256 lendApr;
    uint256 debtTokenTotalSupply;
    uint256 debtTokenLeftToBorrow;
  }

  struct UserData {
    bool loanExists;
    uint256 collateralPrice;
    uint256 marketCollateralAmount;
    uint256 debtTokenCollateralAmount;
    uint256 debtAmount;
    uint256 N;
    uint256 priceLow;
    uint256 priceHigh;
    uint256 liquidationDiscount;
    int256 health;
    int256[2] bandRange;
    uint256[][2] usersBands;
    uint256 collRatio;
    bool isInSoftLiquidation;
    uint256 debtTokenSuppliedShares;
    uint256 debtTokenSuppliedAssets;
  }

  function userData(address market, address user) external view returns (UserData memory) {
      ILlamaLendController ctrl = ILlamaLendController(market);
      uint256 debtTokenSuppliedShares = IERC20(ctrl.factory()).balanceOf(user);
      uint256 debtTokenSuppliedAssets = IERC4626(ctrl.factory()).convertToAssets(debtTokenSuppliedShares);
      ILLAMMA amm = ILLAMMA(ctrl.amm());

      if (!ctrl.loan_exists(user)) {
        int256[2] memory bandRange = [int256(0), int256(0)];
        uint256[][2] memory usersBands;

        return UserData({
          loanExists: false,
          collateralPrice: 0,
          marketCollateralAmount: 0,
          debtTokenCollateralAmount: 0,
          debtAmount: 0,
          N: 0,
          priceLow: 0,
          priceHigh: 0,
          liquidationDiscount: 0,
          health: 0,
          bandRange: bandRange,
          usersBands: usersBands,
          collRatio: 0,
          isInSoftLiquidation: false,
          debtTokenSuppliedShares: debtTokenSuppliedShares,
          debtTokenSuppliedAssets: debtTokenSuppliedAssets
        });
      }

      uint256[4] memory amounts = ctrl.user_state(user);
      uint256[2] memory prices = ctrl.user_prices(user);
      (uint256 collRatio, bool isInSoftLiquidation) = getCollateralRatio(user, market);

      return UserData({
        loanExists: ctrl.loan_exists(user),
        collateralPrice: amm.price_oracle(),
        marketCollateralAmount: amounts[0],
        debtTokenCollateralAmount: amounts[1],
        debtAmount: amounts[2],
        N: amounts[3],
        priceLow: prices[1],
        priceHigh: prices[0],
        liquidationDiscount: ctrl.liquidation_discount(),
        health: ctrl.health(user, true),
        bandRange: amm.read_user_tick_numbers(user),
        usersBands: amm.get_xy(user),
        collRatio: collRatio,
        isInSoftLiquidation: isInSoftLiquidation,
        debtTokenSuppliedShares: debtTokenSuppliedShares,
        debtTokenSuppliedAssets: debtTokenSuppliedAssets
      });
  }

  function globalData(address market) external view returns (GlobalData memory) {
      ILlamaLendController ctrl = ILlamaLendController(market);
      IAGG agg = IAGG(ctrl.monetary_policy());
      ILLAMMA amm = ILLAMMA(ctrl.amm());
      address collTokenAddr = ctrl.collateral_token();
      address debtTokenAddr = ctrl.borrowed_token();

      return GlobalData({
        collateralToken: collTokenAddr,
        debtToken: debtTokenAddr,
        decimals: IERC20(collTokenAddr).decimals(),
        activeBand: amm.active_band(),
        A: amm.A(),
        totalDebt: ctrl.total_debt(),
        ammPrice: ctrl.amm_price(),
        basePrice: amm.get_base_price(),
        oraclePrice: amm.price_oracle(),
        minted: ctrl.minted(),
        redeemed: ctrl.redeemed(),
        monetaryPolicyRate: agg.rate(market),
        ammRate: amm.rate(),
        minBand: amm.min_band(),
        maxBand: amm.max_band(),
        lendApr: ILlamaLendVault(ctrl.factory()).lend_apr(),
        borrowApr:  ILlamaLendVault(ctrl.factory()).borrow_apr(),
        debtTokenTotalSupply: IERC4626(ctrl.factory()).totalAssets(),
        debtTokenLeftToBorrow: IERC20(debtTokenAddr).balanceOf(market)
    });
  }

  function getBandData(address market, int256 n) external view returns (Band memory) {
      ILlamaLendController ctrl = ILlamaLendController(market);
      ILLAMMA lama = ILLAMMA(ctrl.amm());

      return Band(n, lama.p_oracle_down(n), lama.p_oracle_up(n), lama.bands_y(n), lama.bands_x(n));
  }
  
  function getBandsData(address market, int256 from, int256 to) public view returns (Band[] memory) {
      ILlamaLendController ctrl = ILlamaLendController(market);
      ILLAMMA lama = ILLAMMA(ctrl.amm());
      Band[] memory bands = new Band[](uint256(to-from+1));
      for (int256 i = from; i <= to; i++) {
          bands[uint256(i-from)] = Band(i, lama.p_oracle_down(i), lama.p_oracle_up(i), lama.bands_y(i), lama.bands_x(i));
      }

      return bands;
  }

  function createLoanData(address market, uint256 collateral, uint256 debt, uint256 N) external view returns (CreateLoanData memory) {
    ILlamaLendController ctrl = ILlamaLendController(market);

    uint256 collForHealthCalc = collateral;

    int health = healthCalculator(market, address(0x00), int256(collForHealthCalc), int256(debt), true, N);

    int256 n1 = ctrl.calculate_debt_n1(collateral, debt, N);
    int256 n2 = n1 + int256(N) - 1;

    Band[] memory bands = getBandsData(market, n1, n2);

    return CreateLoanData({
      health: health,
      minColl: ctrl.min_collateral(debt, N),
      maxBorrow: ctrl.max_borrowable(collateral, N),
      bands: bands
    });
  }

  function maxBorrow(address market, uint256 collateral, uint256 N) external view returns (uint256) {
    ILlamaLendController ctrl = ILlamaLendController(market);
    return ctrl.max_borrowable(collateral, N);
  }

  function minCollateral(address market, uint256 debt, uint256 N) external view returns (uint256) {
    ILlamaLendController ctrl = ILlamaLendController(market);
    return ctrl.min_collateral(debt, N);
  }

  function getBandsDataForPosition(address market, uint256 collateral, uint256 debt, uint256 N) external view returns (Band[] memory bands) {
    ILlamaLendController ctrl = ILlamaLendController(market);

    int256 n1 = ctrl.calculate_debt_n1(collateral, debt, N);
    int256 n2 = n1 + int256(N) - 1;

    bands = getBandsData(market, n1, n2);
  }

  function healthCalculator(address market, address user, int256 collChange, int256 debtChange, bool isFull, uint256 numBands) public view returns (int256 health) {
    ILlamaLendController ctrl = ILlamaLendController(market);

    health =  ctrl.health_calculator(user, collChange, debtChange, isFull, numBands);
  }
}