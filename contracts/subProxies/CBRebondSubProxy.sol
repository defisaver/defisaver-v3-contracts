// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../auth/ProxyPermission.sol";
import "../core/strategy/SubStorage.sol";
import "../actions/liquity/helpers/CBHelper.sol";

/// @title SubProxy to inject subId during subscription for the cb rebond strategy
contract CBRebondSubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper, CBHelper {

    /// @notice Subscribes to an deployed cb rebond strategy
    /// @param _bondID Nft id of the chicken bond
    function subToRebondStrategy(
        uint256 _bondID
    ) public {
        givePermission(PROXY_AUTH_ADDR);

        // returns .length which is the next id we are subscribing
        uint256 newSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount();

        StrategySub memory repaySub = formatRebondSub(REBOND_STRATEGY_ID, newSubId, _bondID);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);
    }
}