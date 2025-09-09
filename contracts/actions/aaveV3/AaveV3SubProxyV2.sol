// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {AdminAuth} from "../../auth/AdminAuth.sol";
import {Permission} from "../../auth/Permission.sol";
import {SubStorage} from "../../core/strategy/SubStorage.sol";
import {CheckWalletType} from "../../utils/CheckWalletType.sol";
import {AaveV3Helper} from "./helpers/AaveV3Helper.sol";
import {StrategyModel} from "../../core/strategy/StrategyModel.sol";
import {CoreHelper} from "../../core/helpers/CoreHelper.sol";

/// @title Subscribes users to boost/repay strategies with EOA support
contract AaveV3SubProxyV2 is StrategyModel, AdminAuth, CoreHelper, Permission, CheckWalletType, AaveV3Helper {
    uint64 public immutable REPAY_BUNDLE_ID;
    uint64 public immutable BOOST_BUNDLE_ID;

    constructor(uint64 _repayBundleId, uint64 _boostBundleId) {
        REPAY_BUNDLE_ID = _repayBundleId;
        BOOST_BUNDLE_ID = _boostBundleId;
    }

    enum RatioState {
        OVER,
        UNDER
    }

    /// @dev 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 5e16;

    error WrongSubParams(uint128 minRatio, uint128 maxRatio);
    error RangeTooClose(uint128 ratio, uint128 targetRatio);

    /// @dev Input data from the user, for both repay/boost bundles
    struct AaveSubData {
        uint128 minRatio;
        uint128 maxRatio;
        uint128 targetRatioBoost;
        uint128 targetRatioRepay;
        bool boostEnabled;
        address market;
        bool isEOA;
    }

    /// @notice Parses input data and subscribes user to repay and boost bundles
    /// @dev Gives wallet permission if needed and registers a new sub
    /// @dev If boostEnabled = false it will only create a repay bundle
    /// @dev User can't just sub a boost bundle without repay
    function subToAaveAutomation(bytes calldata _encodedInput) public {
        /// @dev Give permission to dsproxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));

        AaveSubData memory subData = parseSubData(_encodedInput);

        StrategySub memory repaySub = formatRepaySub(subData, address(this), msg.sender);
        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);

        if (subData.boostEnabled) {
            _validateSubData(subData);

            StrategySub memory boostSub = formatBoostSub(subData, address(this), msg.sender);
            SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
        }
    }

    /// @notice Calls SubStorage to update the users subscription data
    /// @dev Updating sub data will activate it as well
    /// @dev If we don't have a boost subId send as 0
    function updateSubData(bytes calldata _encodedInput) public {
        /// @dev Give permission to dsproxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));
        (uint32 subId1, uint32 subId2) = parseSubIds(_encodedInput[0:8]);

        AaveSubData memory subData = parseSubData(_encodedInput[8:]);

        // update repay as we must have a subId, it's ok if it's the same data
        StrategySub memory repaySub = formatRepaySub(subData, address(this), msg.sender);
        SubStorage(SUB_STORAGE_ADDR).updateSubData(subId1, repaySub);
        SubStorage(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subData.boostEnabled) {
            _validateSubData(subData);

            StrategySub memory boostSub = formatBoostSub(subData, address(this), msg.sender);

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

    /// @notice Activates Repay sub and if exists a Boost sub
    function activateSub(bytes calldata _encodedInput) public {
        /// @dev Give permission to dsproxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));
        (uint32 subId1, uint32 subId2) = parseSubIds(_encodedInput[0:8]);

        SubStorage(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).activateSub(subId2);
        }
    }

    /// @notice Deactivates Repay sub and if exists a Boost sub
    function deactivateSub(bytes calldata _encodedInput) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(_encodedInput[0:8]);

        SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId1);

        if (subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId2);
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
    function formatRepaySub(AaveSubData memory _subData, address _wallet, address _eoa)
        public
        view
        returns (StrategySub memory repaySub)
    {
        repaySub.strategyOrBundleId = REPAY_BUNDLE_ID;
        repaySub.isBundle = true;

        address user = _subData.isEOA ? _eoa : _wallet;

        // owner, market, triggerRatioRepay, ratioState
        bytes memory triggerData =
            abi.encode(user, _subData.market, uint256(_subData.minRatio), uint8(RatioState.UNDER));
        repaySub.triggerData = new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData = new bytes32[](5);
        repaySub.subData[0] = bytes32(uint256(_subData.targetRatioRepay)); // targetRatio
        repaySub.subData[1] = bytes32(uint256(1)); // ratioState = repay
        repaySub.subData[2] = bytes32(uint256(uint160(_subData.market))); // market addr
        repaySub.subData[3] = bytes32(uint256(_subData.isEOA ? 1 : 0)); // useOnBehalf
        repaySub.subData[4] = bytes32(uint256(uint160(user))); // onBehalfAddr
    }

    /// @notice Formats a StrategySub struct to a Boost bundle from the input data of the specialized aave sub
    function formatBoostSub(AaveSubData memory _subData, address _wallet, address _eoa)
        public
        view
        returns (StrategySub memory boostSub)
    {
        boostSub.strategyOrBundleId = BOOST_BUNDLE_ID;
        boostSub.isBundle = true;

        address user = _subData.isEOA ? _eoa : _wallet;

        bytes memory triggerData = abi.encode(user, _subData.market, uint256(_subData.maxRatio), uint8(RatioState.OVER));
        boostSub.triggerData = new bytes[](1);
        boostSub.triggerData[0] = triggerData;

        boostSub.subData = new bytes32[](5);
        boostSub.subData[0] = bytes32(uint256(_subData.targetRatioBoost)); // targetRatio
        boostSub.subData[1] = bytes32(uint256(0)); // ratioState = boost
        boostSub.subData[2] = bytes32(uint256(uint160(_subData.market))); // market addr
        boostSub.subData[3] = bytes32(uint256(_subData.isEOA ? 1 : 0)); // onBehalfOf
        boostSub.subData[4] = bytes32(uint256(uint160(user))); // onBehalfAddr
    }

    function parseSubData(bytes calldata _encodedInput) public pure returns (AaveSubData memory user) {
        user.minRatio = uint128(bytes16(_encodedInput[0:16]));
        user.maxRatio = uint128(bytes16(_encodedInput[16:32]));
        user.targetRatioBoost = uint128(bytes16(_encodedInput[32:48]));
        user.targetRatioRepay = uint128(bytes16(_encodedInput[48:64]));
        user.boostEnabled = (bytes1(_encodedInput[64:65])) != bytes1(0x00); // compare to get bool
        user.market = address(bytes20(_encodedInput[65:85]));
        user.isEOA = (bytes1(_encodedInput[85:86])) != bytes1(0x00); // compare to get bool
    }

    function parseSubIds(bytes calldata _encodedInput) public pure returns (uint32 subId1, uint32 subId2) {
        subId1 = uint32(bytes4(_encodedInput[0:4]));
        subId2 = uint32(bytes4(_encodedInput[4:8]));
    }
}
