// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../auth/ProxyPermission.sol";
import "../core/strategy/SubStorage.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";

/// @title SubProxy to inject subId during subscription for the Liquty CB Payback strategy
contract LiquityCBPaybackSubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper, LiquityHelper {

    error ArrayLengthNotMatching();

    /// @notice Subscribes to an deployed cb rebond strategy
    function subToStrategy(
        uint256 sourceId,
        uint256 sourceType,
        uint256 triggerRatio,
        uint8 triggerState
    ) public {
        givePermission(PROXY_AUTH_ADDR);
        
        StrategySub memory repaySub;

        repaySub = formatLiquityCBPaybackSub(sourceId, sourceType, triggerRatio, triggerState);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);
    }

}