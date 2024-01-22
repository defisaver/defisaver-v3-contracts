// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/Permission.sol";
import "../../core/strategy/SubStorage.sol";
import "../../utils/CheckWalletType.sol";

/// @title Contract that subscribes users to Aave V2 automation bundles
contract AaveSubProxy is StrategyModel, AdminAuth, CoreHelper, Permission, CheckWalletType {
    uint64 public immutable REPAY_BUNDLE_ID; 
    uint64 public immutable BOOST_BUNDLE_ID;

    enum RatioState { OVER, UNDER }

    constructor(uint64 _repayBundleId, uint64 _boostBundleId) {
        REPAY_BUNDLE_ID = _repayBundleId;
        BOOST_BUNDLE_ID = _boostBundleId;
    }

    /// @dev 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    error WrongSubParams(uint256 minRatio, uint256 maxRatio);
    error RangeTooClose(uint256 ratio, uint256 targetRatio);

    address public constant AAVE_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    struct AaveSubData {
        uint128 minRatio;
        uint128 maxRatio;
        uint128 targetRatioBoost;
        uint128 targetRatioRepay;
        bool boostEnabled;
    }

    /// @notice Parses input data and subscribes user to repay and boost bundles
    /// @dev Gives wallet permission if needed and registers a new sub
    /// @dev If boostEnabled = false it will only create a repay bundle
    /// @dev User can't just sub a boost bundle without repay
    function subToAaveAutomation(
        AaveSubData calldata _subData
    ) public {
        /// @dev Give permission to dsproxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));
        
        StrategySub memory repaySub = formatRepaySub(_subData, address(this));

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);
        if (_subData.boostEnabled) {
            _validateSubData(_subData);

            StrategySub memory boostSub = formatBoostSub(_subData, address(this));
            SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
        }
    }

    /// @notice Calls SubStorage to update the users subscription data
    /// @dev Updating sub data will activate it as well
    /// @dev If we don't have a boost subId send as 0
    function updateSubData(
        uint32 _subId1,
        uint32 _subId2,
        AaveSubData calldata _subData
    ) public {

        // update repay as we must have a subId, it's ok if it's the same data
        StrategySub memory repaySub = formatRepaySub(_subData, address(this));
        SubStorage(SUB_STORAGE_ADDR).updateSubData(_subId1, repaySub);
        SubStorage(SUB_STORAGE_ADDR).activateSub(_subId1);

        if (_subData.boostEnabled) {
            _validateSubData(_subData);

            StrategySub memory boostSub = formatBoostSub(_subData, address(this));

            // if we don't have a boost bundleId, create one
            if (_subId2 == 0) {
                SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
            } else {
                SubStorage(SUB_STORAGE_ADDR).updateSubData(_subId2, boostSub);
                SubStorage(SUB_STORAGE_ADDR).activateSub(_subId2);
            }
        } else {
            if (_subId2 != 0) {
                SubStorage(SUB_STORAGE_ADDR).deactivateSub(_subId2);
            }
        }
    }

    /// @notice Activates Repay sub and if exists a Boost sub
    function activateSub(
        uint32 _subId1,
        uint32 _subId2
    ) public {
        SubStorage(SUB_STORAGE_ADDR).activateSub(_subId1);

        if (_subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).activateSub(_subId2);
        }
    }

    /// @notice Deactivates Repay sub and if exists a Boost sub
    function deactivateSub(
        uint32 _subId1,
        uint32 _subId2
    ) public {
        SubStorage(SUB_STORAGE_ADDR).deactivateSub(_subId1);

        if (_subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(_subId2);
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
    function formatRepaySub(AaveSubData memory _subData, address _wallet) public view returns (StrategySub memory repaySub) {
        repaySub.strategyOrBundleId = REPAY_BUNDLE_ID;
        repaySub.isBundle = true;

        // format data for ratio trigger if currRatio < minRatio = true
        bytes memory triggerData = abi.encode(_wallet, AAVE_MARKET, uint256(_subData.minRatio), uint8(RatioState.UNDER));
        repaySub.triggerData =  new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData = new bytes32[](3);
        repaySub.subData[0] = bytes32(uint256(uint160(AAVE_MARKET))); // market
        repaySub.subData[1] = bytes32(uint256(_subData.targetRatioRepay)); // targetRatio
        repaySub.subData[2] = bytes32(uint256(1)); // ratioState = repay
    }

    /// @notice Formats a StrategySub struct to a Boost bundle from the input data of the specialized aave sub
    function formatBoostSub(AaveSubData memory _subData, address _wallet) public view returns (StrategySub memory boostSub) {
        boostSub.strategyOrBundleId = BOOST_BUNDLE_ID;
        boostSub.isBundle = true;

        // format data for ratio trigger if currRatio > maxRatio = true
        bytes memory triggerData = abi.encode(_wallet, AAVE_MARKET, uint256(_subData.maxRatio), uint8(RatioState.OVER));
        boostSub.triggerData =  new bytes[](1);
        boostSub.triggerData[0] = triggerData;

        boostSub.subData = new bytes32[](4);
        boostSub.subData[0] = bytes32(uint256(uint160(AAVE_MARKET)));  // market
        boostSub.subData[1] = bytes32(uint256(_subData.targetRatioBoost)); // targetRatio
        boostSub.subData[2] = bytes32(uint256(0)); // ratioState = boost
        boostSub.subData[3] = bytes32(uint256(1)); // enableAsColl = true

    }
}