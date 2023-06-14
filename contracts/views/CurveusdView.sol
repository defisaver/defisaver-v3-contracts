// SPDX-Licence-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../interfaces/curve/ICrvUSDController.sol";
import "../interfaces/curve/ILlamma.sol";

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
    uint256 min_coll;
    uint256 max_borr;
    Band[] bands;
  }
    
  function createLoanData(address market, uint256 collateral, uint256 debt, uint256 N) external view returns (CreateLoanData memory) {
    ICrvUSDController ctrl = ICrvUSDController(market);
    ILlamma lama = ILlamma(ctrl.amm());

    int256 health = ctrl.health_calculator(address(0x00), int256(collateral), int256(debt), true, N);
    uint256 min_coll = ctrl.min_collateral(debt, N);
    uint256 max_borr = ctrl.max_borrowable(collateral, N);

    int256 n1 = ctrl.calculate_debt_n1(collateral, debt, N);
    int256 n2 = n1 + int256(N) - 1;

    Band[] memory bands = new Band[](N);

    for (int256 i = n1; i <= n2; i++) {
        bands[uint256(i-n1)] = Band(i, lama.p_oracle_down(i), lama.p_oracle_up(i), lama.bands_x(i), lama.bands_y(i));
    }

    return CreateLoanData(
      health,
      min_coll,
      max_borr,
      bands
    );
  }
}
