// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/curveusd/ICurveUsd.sol";

contract CurveUsdSoftLiquidationTrigger is ITrigger, AdminAuth {
    /// @param market - CurveUsd market
    /// @param user - Address of the position owner
    /// @param percentage - Price percentage threshold for triggering before soft liquidation
    struct SubParams {
        address market;
        address user;
        uint256 percentage;
    }

    /// @dev checks if user is in, or %percentage away from soft liquidation
    /// @dev if the user is fully soft liquidated "percentage" is ignored and returns false
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseInputs(_subData);

        ICrvUsdController ctrl = ICrvUsdController(triggerSubData.market);
        ILLAMMA amm = ILLAMMA(ctrl.amm());

        int256[2] memory bandRange = amm.read_user_tick_numbers(triggerSubData.user);
        int256 activeBand = amm.active_band();

        if (activeBand > bandRange[1]) return false;
        if (activeBand <= bandRange[0]) return true;

        uint256 highBandPrice = amm.p_oracle_up(bandRange[0]);
        uint256 ammPrice = amm.get_p();
        uint256 thresholdPrice = (highBandPrice * (1e18 + triggerSubData.percentage)) / 1e18;

        if (ammPrice < thresholdPrice) return true;

        return false;
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
