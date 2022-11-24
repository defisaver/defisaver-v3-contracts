// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../auth/ProxyPermission.sol";
import "../core/strategy/SubStorage.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";

/// @title SubProxy to make LiquityCBPayback Strategy easier to subscribe to
contract LiquityCBPaybackSubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper, LiquityHelper {

    error ArrayLengthNotMatching();

    function subToStrategy(
        uint256 sourceId,
        uint256 sourceType,
        uint256 triggerRatio,
        uint8 triggerState
    ) public {
        givePermission(PROXY_AUTH_ADDR);
        
        StrategySub memory paybackSub;

        paybackSub = formatLiquityCBPaybackSub(sourceId, sourceType, triggerRatio, triggerState);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(paybackSub);
    }

    function updateSub(
        uint256 subId,
        uint256 sourceId,
        uint256 sourceType,
        uint256 triggerRatio,
        uint8 triggerState
    ) public {
        StrategySub memory paybackSub;

        paybackSub = formatLiquityCBPaybackSub(sourceId, sourceType, triggerRatio, triggerState);

        SubStorage(SUB_STORAGE_ADDR).updateSubData(subId, paybackSub);
    }

}