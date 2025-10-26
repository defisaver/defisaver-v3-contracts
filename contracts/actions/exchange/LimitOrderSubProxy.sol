// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { Permission } from "../../auth/Permission.sol";
import { SubStorage } from "../../core/strategy/SubStorage.sol";
import { UtilAddresses } from "../../utils/addresses/UtilAddresses.sol";
import { SmartWalletUtils } from "../../utils/SmartWalletUtils.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract LimitOrderSubProxy is
    StrategyModel,
    AdminAuth,
    CoreHelper,
    Permission,
    UtilAddresses,
    SmartWalletUtils
{
    error InvalidTokenAddresses(address tokenSellAddr, address tokenBuyAddr);
    error InvalidAmount();

    uint64 public immutable LIMIT_ORDER_ID;

    constructor(uint64 _limitOrderId) {
        LIMIT_ORDER_ID = _limitOrderId;
    }

    enum OrderType {
        TAKE_PROFIT,
        STOP_LOSS
    }

    struct LimitOrderSub {
        address tokenSellAddr; // erc20 sell token address
        address tokenBuyAddr; // erc20 buy token address
        uint256 amount; // amount in wei we are selling
        uint256 limitPrice; // price of execution, minimal price we are willing to accept
        uint256 goodUntilDuration; // amount of time in seconds that the order is valid for
        OrderType orderType; // type of order, take profit or stop loss
    }

    function subToLimitOrder(LimitOrderSub memory _subData) external {
        /// @dev Give wallet permission to our auth contract to be able to execute the strategy
        _giveAuthContractPermission(_getWalletType(address(this)));

        _validateData(_subData);

        StrategySub memory limitOrderSub = formatLimitOrderSub(_subData);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(limitOrderSub);
    }

    function formatLimitOrderSub(LimitOrderSub memory _subData)
        public
        view
        returns (StrategySub memory limitOrderSub)
    {
        limitOrderSub.strategyOrBundleId = LIMIT_ORDER_ID;
        limitOrderSub.isBundle = false;

        uint256 goodUntilTimestamp = block.timestamp + _subData.goodUntilDuration;

        bytes memory triggerData =
            abi.encode(_subData.limitPrice, goodUntilTimestamp, _subData.orderType);
        limitOrderSub.triggerData = new bytes[](1);
        limitOrderSub.triggerData[0] = triggerData;

        limitOrderSub.subData = new bytes32[](3);
        limitOrderSub.subData[0] = bytes32(uint256(uint160(_subData.tokenSellAddr)));
        limitOrderSub.subData[1] = bytes32(uint256(uint160(_subData.tokenBuyAddr)));
        limitOrderSub.subData[2] = bytes32(uint256(_subData.amount));
    }

    function _validateData(LimitOrderSub memory _subData) internal pure {
        if (_subData.amount == 0 || _subData.limitPrice == 0 || _subData.goodUntilDuration == 0) {
            revert InvalidAmount();
        }

        if (_subData.tokenSellAddr == _subData.tokenBuyAddr) {
            revert InvalidTokenAddresses(_subData.tokenSellAddr, _subData.tokenBuyAddr);
        }

        if (_subData.tokenSellAddr == ETH_ADDR || _subData.tokenBuyAddr == ETH_ADDR) {
            revert InvalidTokenAddresses(_subData.tokenSellAddr, _subData.tokenBuyAddr);
        }
    }
}
