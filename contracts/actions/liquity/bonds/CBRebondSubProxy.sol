// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../../auth/AdminAuth.sol";
import { Permission } from "../../../auth/Permission.sol";
import { SubStorage } from "../../../core/strategy/SubStorage.sol";
import { CBHelper } from "../helpers/CBHelper.sol";
import { CheckWalletType } from "../../../utils/CheckWalletType.sol";
import { StrategyModel } from "../../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../../core/helpers/CoreHelper.sol";

/// @title SubProxy to inject subId during subscription for the cb rebond strategy
contract CBRebondSubProxy is StrategyModel, AdminAuth, CoreHelper, Permission, CBHelper, CheckWalletType {

    /// @notice Subscribes to an deployed cb rebond strategy
    /// @param _bondID Nft id of the chicken bond
    function subToRebondStrategy(
        uint256 _bondID
    ) public {
         /// @dev Give permission to dsproxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));

        // returns .length which is the next id we are subscribing
        uint256 newSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount();

        StrategySub memory repaySub = formatRebondSub(newSubId, _bondID);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);
    }
}