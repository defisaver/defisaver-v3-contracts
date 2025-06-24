// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/ITrigger.sol";
import { ICrvUsdController, ILLAMMA } from "../interfaces/curveusd/ICurveUsd.sol";

/// @title Trigger that triggers when a user is in, or %percentage away from soft liquidation
contract CurveUsdSoftLiquidationTrigger is ITrigger, AdminAuth {
    /// @param market - CurveUsd market
    /// @param user - Address of the position owner
    /// @param percentage - Price percentage threshold for triggering before soft liquidation
    struct SubParams {
        address market;
        address user;
        uint256 percentage;
    }

    /// @notice Checks if user is in, or %percentage away from soft liquidation
    /// @notice If the user is fully soft liquidated "percentage" is ignored and returns false
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);
        uint256 percentage = calcPercentage(triggerSubData.market, triggerSubData.user);

        return percentage <= triggerSubData.percentage;
    }

    function calcPercentage(address _market, address _user) public view returns (uint256 percentage) {
        ICrvUsdController ctrl = ICrvUsdController(_market);
        ILLAMMA amm = ILLAMMA(ctrl.amm());

        // check if user has the position
        if (!ctrl.loan_exists(_user)) return type(uint256).max;

        int256[2] memory bandRange = amm.read_user_tick_numbers(_user);
        int256 activeBand = amm.active_band();

        if (activeBand > bandRange[1]) return type(uint256).max;
        if (activeBand >= bandRange[0]) return 0;

        uint256 highBandPrice = amm.p_oracle_up(bandRange[0]);
        uint256 oraclePrice = amm.price_oracle();

        if (oraclePrice < highBandPrice) return 0;

        return percentage = oraclePrice * 1e18 / highBandPrice - 1e18;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
