// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ICrvUsdController, ILLAMMA } from "../../../interfaces/curveusd/ICurveUsd.sol";
import "./MainnetCurveUsdAddresses.sol";


contract CurveUsdHelper is MainnetCurveUsdAddresses {
    error CurveUsdInvalidController();

    function userMaxWithdraw(address _controllerAddress, address _user) public view returns (uint256 maxWithdraw) {
        address llammaAddress = ICrvUsdController(_controllerAddress).amm();
        int256[2] memory ticks = ILLAMMA(llammaAddress).read_user_tick_numbers(_user);
        uint256[2] memory xy = ILLAMMA(llammaAddress).get_sum_xy(_user);
        
        uint256 collateral = xy[1];
        uint256 debt = ICrvUsdController(_controllerAddress).debt(_user);
        uint256 nBands = uint256(ticks[1] - ticks[0]) + 1;

        return collateral - ICrvUsdController(_controllerAddress).min_collateral(debt, nBands);
    }

    function userMaxBorrow(address _controllerAddress, address _user) public view returns (uint256 maxBorrow) {
        address llammaAddress = ICrvUsdController(_controllerAddress).amm();
        int256[2] memory ticks = ILLAMMA(llammaAddress).read_user_tick_numbers(_user);
        uint256[2] memory xy = ILLAMMA(llammaAddress).get_sum_xy(_user);
        
        uint256 collateral = xy[1];
        uint256 debt = ICrvUsdController(_controllerAddress).debt(_user);
        uint256 nBands = uint256(ticks[1] - ticks[0]) + 1;

        return ICrvUsdController(_controllerAddress).max_borrowable(collateral, nBands) - debt;
    }
}