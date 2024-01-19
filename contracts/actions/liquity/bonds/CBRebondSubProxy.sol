// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../auth/AdminAuth.sol";
import "../../../auth/Permission.sol";
import "../../../core/strategy/SubStorage.sol";
import "../helpers/CBHelper.sol";
import "../../../utils/CheckWalletType.sol";

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