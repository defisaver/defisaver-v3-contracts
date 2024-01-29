// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/Permission.sol";
import "../../core/strategy/SubStorage.sol";
import "../../utils/CheckWalletType.sol";

/// @title Subscribes users to boost/repay strategies in an L2 gas efficient way
contract CompV3SubProxyL2 is StrategyModel, AdminAuth, CoreHelper, Permission, CheckWalletType {

    /// @dev 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;
    
    uint64 public immutable REPAY_BUNDLE_ID; 
    uint64 public immutable BOOST_BUNDLE_ID; 

    constructor(uint64 _repayBundleId, uint64 _boostBundleId) {
        REPAY_BUNDLE_ID = _repayBundleId;
        BOOST_BUNDLE_ID = _boostBundleId;
    }

    enum RatioState { OVER, UNDER }

    error WrongSubParams(uint256 minRatio, uint256 maxRatio);
    error RangeTooClose(uint256 ratio, uint256 targetRatio);

    struct CompV3SubData {
        address market;
        address baseToken;
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
    function subToCompV3Automation(
        bytes calldata _encodedInput
    ) public {
         /// @dev Give permission to dsproxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));

        CompV3SubData memory subData = parseSubData(_encodedInput);
        StrategySub memory repaySub = formatRepaySub(subData);
        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);

        if (subData.boostEnabled) {
            _validateSubData(subData);

            StrategySub memory boostSub = formatBoostSub(subData);
            SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
        }
    }

    /// @notice Calls SubStorage to update the users subscription data
    /// @dev Updating sub data will activate it as well
    /// @dev If we don't have a boost subId, send 0
    function updateSubData(
        bytes calldata _encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(_encodedInput[0:8]);

        CompV3SubData memory subData = parseSubData(_encodedInput[8:]);

        // update repay as we must have a subId1, it's ok if it's the same data
        StrategySub memory repaySub = formatRepaySub(subData);
        SubStorage(SUB_STORAGE_ADDR).updateSubData(subId1, repaySub);
        SubStorage(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subData.boostEnabled) {
            _validateSubData(subData);

            StrategySub memory boostSub = formatBoostSub(subData);

            // if we don't have a boost bundleId, create one
            if (subId2 == 0) {
                SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
            } else {
                SubStorage(SUB_STORAGE_ADDR).updateSubData(subId2, boostSub);
                SubStorage(SUB_STORAGE_ADDR).activateSub(subId2);
            }
        } else {
            if (subId2 != 0) {
                SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId2);
            }
        }
    }

    /// @notice Activates Repay sub and Boost sub if exists
    function activateSub(
        bytes calldata _encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(_encodedInput[0:8]);

        SubStorage(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).activateSub(subId2);
        }
    }

    /// @notice Deactivates Repay sub and Boost sub if exists
    function deactivateSub(
        bytes calldata _encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(_encodedInput[0:8]);

        SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId1);

        if (subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId2);
        }
    }

    ///////////////////////////////// HELPER FUNCTIONS /////////////////////////////////

    function _validateSubData(CompV3SubData memory _subData) internal pure {
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

    /// @notice Formats a StrategySub struct to a Repay bundle from the input data of the specialized compV3 sub
    function formatRepaySub(CompV3SubData memory _subData) public view returns (StrategySub memory repaySub) {
        repaySub.strategyOrBundleId = REPAY_BUNDLE_ID;
        repaySub.isBundle = true;

        // format data for ratio trigger if currRatio < minRatio = true
        bytes memory triggerData = abi.encode(address(this), _subData.market, uint256(_subData.minRatio), uint8(RatioState.UNDER));
        repaySub.triggerData =  new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData =  new bytes32[](4);
        repaySub.subData[0] = bytes32(uint256(uint160(_subData.market)));
        repaySub.subData[1] = bytes32(uint256(uint160(_subData.baseToken)));
        repaySub.subData[2] = bytes32(uint256(1)); // ratioState = repay
        repaySub.subData[3] = bytes32(uint256(_subData.targetRatioRepay)); // targetRatio
    }

    /// @notice Formats a StrategySub struct to a Boost bundle from the input data of the specialized compV3 sub
    function formatBoostSub(CompV3SubData memory _subData) public view returns (StrategySub memory boostSub) {
        boostSub.strategyOrBundleId = BOOST_BUNDLE_ID;
        boostSub.isBundle = true;

        // format data for ratio trigger if currRatio > maxRatio = true
        bytes memory triggerData = abi.encode(address(this), _subData.market, uint256(_subData.maxRatio), uint8(RatioState.OVER));
        boostSub.triggerData =  new bytes[](1);
        boostSub.triggerData[0] = triggerData;

        boostSub.subData =  new bytes32[](4);
        boostSub.subData[0] = bytes32(uint256(uint160(_subData.market)));
        boostSub.subData[1] = bytes32(uint256(uint160(_subData.baseToken)));
        boostSub.subData[2] = bytes32(uint256(0)); // ratioState = boost
        boostSub.subData[3] = bytes32(uint256(_subData.targetRatioBoost)); // targetRatio
    }

    function parseSubData(bytes calldata _encodedInput) public pure returns (CompV3SubData memory sub) {
        sub.market = address(bytes20(_encodedInput[0:20]));
        sub.baseToken = address(bytes20(_encodedInput[20:40]));
        sub.minRatio = uint128(bytes16(_encodedInput[40:56]));
        sub.maxRatio = uint128(bytes16(_encodedInput[56:72]));
        sub.targetRatioBoost = uint128(bytes16(_encodedInput[72:88]));
        sub.targetRatioRepay = uint128(bytes16(_encodedInput[88:104]));
        sub.boostEnabled = (bytes1(_encodedInput[104:105])) != bytes1(0x00); // compare to get bool      
    }

    function parseSubIds(bytes calldata _encodedInput) public pure returns (uint32 subId1, uint32 subId2) {
        subId1 = uint32(bytes4(_encodedInput[0:4]));
        subId2 = uint32(bytes4(_encodedInput[4:8]));
    }
}
