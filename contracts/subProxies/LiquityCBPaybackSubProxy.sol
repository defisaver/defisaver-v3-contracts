// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../auth/ProxyPermission.sol";
import "../core/strategy/SubStorage.sol";
import "../actions/liquity/helpers/CBHelper.sol";

/// @title SubProxy to inject subId during subscription for the Liquty CB Payback strategy
contract LiquityCBPaybackSubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper {

    error ArrayLengthNotMatching();
    uint64 constant LIQUITY_PAYBACK_BUNDLE_ID = 0;

    /// @notice Subscribes to an deployed cb rebond strategy
    function subToStrategy(
        uint256[] memory sourceIds,
        uint256[] memory sourceTypes,
        uint256 triggerRatio,
        uint8 triggerState
    ) public {
        givePermission(PROXY_AUTH_ADDR);
        
        if (sourceIds.length != sourceTypes.length){
            revert ArrayLengthNotMatching();
        }
        StrategySub memory repaySub;
        if (sourceIds.length > 1) {
            // returns .length which is the next id we are subscribing
            uint256 newSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount();
            repaySub = formatMultiPaybackSub(newSubId, sourceIds, sourceTypes, triggerRatio, triggerState);
        }
        if (sourceIds.length == 1) {
            repaySub = formatSinglePaybackSub(sourceIds[0], sourceTypes[0], triggerRatio, triggerState);
        }

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);
    }

    function formatSinglePaybackSub(uint256 _sourceId, uint256 _sourceType, uint256 _ratio, uint256 _state) public view returns (StrategyModel.StrategySub memory paybackSub) {
        paybackSub.strategyOrBundleId = LIQUITY_PAYBACK_BUNDLE_ID;
        paybackSub.isBundle = true;

        bytes memory triggerData = abi.encode(address(this), _ratio, _state);
        paybackSub.triggerData =  new bytes[](1);
        paybackSub.triggerData[0] = triggerData;

        paybackSub.subData =  new bytes32[](2);
        paybackSub.subData[0] = bytes32(_sourceId);
        paybackSub.subData[1] = bytes32(_sourceType);
    }

    function formatMultiPaybackSub(
        uint256 _subId,
        uint256[] memory _sourceIds,
        uint256[] memory _sourceTypes,
        uint256 _ratio,
        uint8 _state
    ) public view returns (StrategyModel.StrategySub memory paybackSub) {
        paybackSub.strategyOrBundleId = LIQUITY_PAYBACK_BUNDLE_ID;
        paybackSub.isBundle = true;

        bytes memory triggerData = abi.encode(address(this), _ratio, _state);
        paybackSub.triggerData =  new bytes[](1);
        paybackSub.triggerData[0] = triggerData;

        paybackSub.subData =  new bytes32[](2 + _sourceIds.length * 2);
        paybackSub.subData[0] = bytes32(_subId);
        paybackSub.subData[1] = bytes32(_sourceIds.length);
        for (uint256 i = 0; i < _sourceIds.length; i++){
            paybackSub.subData[2 + i] = bytes32(_sourceIds[i]);
            paybackSub.subData[2 + _sourceIds.length + i] = bytes32(_sourceTypes[i]);
        }
    }
}