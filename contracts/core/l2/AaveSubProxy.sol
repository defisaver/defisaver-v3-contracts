// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "./SubStorageL2.sol";

/// @title Subscribes users to boost/repay strategies in an L2 gas efficient way
contract AaveSubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper {
    uint64 public constant REPAY_BUNDLE_ID = 0; 
    uint64 public constant BOOST_BUNDLE_ID = 1; 

    enum RatioState { OVER, UNDER }

    address public constant AAVE_MARKET = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;

    /// @dev 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    error WrongSubParams(uint128 minRatio, uint128 maxRatio);
    error RangeTooClose(uint128 ratio, uint128 targetRatio);

    /// @dev Input data from the user, for both repay/boost bundles
    struct AaveSubData {
        uint128 minRatio;
        uint128 maxRatio;
        uint128 targetRatioBoost;
        uint128 targetRatioRepay;
        bool boostEnabled;
    }

    /// @notice Parses input data and subscribes user to repay and boost bundles
    /// @dev Gives DSProxy permission if needed and registers a new sub
    /// @dev If boostEnabled = false it will only create a repay bundle
    /// @dev User can't just sub a boost bundle without repay
    function subToAaveAutomation(
        bytes calldata encodedInput
    ) public {
        givePermission(PROXY_AUTH_ADDR);

        AaveSubData memory subData = parseSubData(encodedInput);

        StrategySub memory repaySub = formatRepaySub(subData);
        SubStorageL2(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);

        if (subData.boostEnabled) {
            _validateSubData(subData);

            StrategySub memory boostSub = formatBoostSub(subData);
            SubStorageL2(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
        }
    }

    /// @notice Calls SubStorageL2 to update the users subscription data
    /// @dev Updating sub data will activate it as well
    /// @dev If we don't have a boost subId send as 0
    function updateSubData(
        bytes calldata encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(encodedInput[0:8]);

        AaveSubData memory subData = parseSubData(encodedInput[8:]);

        // update repay as we must have a subId, it's ok if it's the same data
        StrategySub memory repaySub = formatRepaySub(subData);
        SubStorageL2(SUB_STORAGE_ADDR).updateSubData(subId1, repaySub);
        SubStorageL2(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subData.boostEnabled) {
            _validateSubData(subData);

            StrategySub memory boostSub = formatBoostSub(subData);

            // if we don't have a boost bundleId, create one
            if (subId2 == 0) {
                SubStorageL2(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
            } else {
                SubStorageL2(SUB_STORAGE_ADDR).updateSubData(subId2, boostSub);
                SubStorageL2(SUB_STORAGE_ADDR).activateSub(subId2);
            }
        } else {
            if (subId2 != 0) {
                SubStorageL2(SUB_STORAGE_ADDR).deactivateSub(subId2);
            }
        }
    }

    /// @notice Activates Repay sub and if exists a Boost sub
    function activateSub(
        bytes calldata encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(encodedInput[0:8]);

        SubStorageL2(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subId2 != 0) {
            SubStorageL2(SUB_STORAGE_ADDR).activateSub(subId2);
        }
    }

    /// @notice Deactivates Repay sub and if exists a Boost sub
    function deactivateSub(
        bytes calldata encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(encodedInput[0:8]);

        SubStorageL2(SUB_STORAGE_ADDR).deactivateSub(subId1);

        if (subId2 != 0) {
            SubStorageL2(SUB_STORAGE_ADDR).deactivateSub(subId2);
        }
    }


    ///////////////////////////////// HELPER FUNCTIONS /////////////////////////////////

    function _validateSubData(AaveSubData memory _subData) internal pure {
        if (_subData.minRatio > _subData.maxRatio) {
            revert WrongSubParams(_subData.minRatio, _subData.maxRatio);
        }

        if ((_subData.maxRatio - RATIO_OFFSET) < _subData.targetRatioRepay) {
            revert RangeTooClose(_subData.maxRatio, _subData.targetRatioRepay);
        }

        if ((_subData.minRatio + RATIO_OFFSET) > _subData.targetRatioBoost) {
            revert RangeTooClose(_subData.minRatio, _subData.targetRatioBoost);
        }
    }

    /// @notice Formats a StrategySub struct to a Repay bundle from the input data of the specialized aave sub
    function formatRepaySub(AaveSubData memory _user) public view returns (StrategySub memory repaySub) {
        repaySub.strategyOrBundleId = REPAY_BUNDLE_ID;
        repaySub.isBundle = true;

        // format data for ratio trigger if currRatio < minRatio = true
        bytes memory triggerData = abi.encode(address(this), AAVE_MARKET, uint256(_user.minRatio), uint8(RatioState.UNDER));
        repaySub.triggerData =  new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData =  new bytes32[](4);
        repaySub.subData[0] = bytes32(uint256(_user.targetRatioRepay)); // targetRatio
        repaySub.subData[1] = bytes32(uint256(1)); // ratioState = repay
        repaySub.subData[2] = bytes32(uint256(1)); // useDefaultMarket = true
        repaySub.subData[3] = bytes32(uint256(0)); // onBehalfOf = false
    }

    /// @notice Formats a StrategySub struct to a Boost bundle from the input data of the specialized aave sub
    function formatBoostSub(AaveSubData memory _user) public view returns (StrategySub memory repaySub) {
        repaySub.strategyOrBundleId = BOOST_BUNDLE_ID;
        repaySub.isBundle = true;

        // format data for ratio trigger if currRatio > maxRatio = true
        bytes memory triggerData = abi.encode(address(this), AAVE_MARKET, uint256(_user.maxRatio), uint8(RatioState.OVER));
        repaySub.triggerData = new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData =  new bytes32[](5);
        repaySub.subData[0] = bytes32(uint256(_user.targetRatioBoost)); // targetRatio
        repaySub.subData[1] = bytes32(uint256(0)); // ratioState = boost
        repaySub.subData[2] = bytes32(uint256(1)); // useDefaultMarket = true
        repaySub.subData[3] = bytes32(uint256(0)); // onBehalfOf = false
        repaySub.subData[4] = bytes32(uint256(1)); // enableAsColl = true
    }

    function parseSubData(bytes calldata encodedInput) public pure returns (AaveSubData memory user) {
        user.minRatio = uint128(bytes16(encodedInput[0:16]));
        user.maxRatio = uint128(bytes16(encodedInput[16:32]));
        user.targetRatioBoost = uint128(bytes16(encodedInput[32:48]));
        user.targetRatioRepay = uint128(bytes16(encodedInput[48:64]));
        user.boostEnabled = (bytes1(encodedInput[64:65])) != bytes1(0x00); // compare to get bool
    }

    function parseSubIds(bytes calldata encodedInput) public pure returns (uint32 subId1, uint32 subId2) {
        subId1 = uint32(bytes4(encodedInput[0:4]));
        subId2 = uint32(bytes4(encodedInput[4:8]));
    }
}
