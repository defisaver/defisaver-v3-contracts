// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "./SubStorage.sol";

/// @title Called through DSProxy, handles auth and calls subscription contract
contract AaveSubProxy is StrategyModel, AdminAuth, ProxyPermission, CoreHelper {

    uint64 public constant REPAY_BUNDLE_ID = 0; 
    uint64 public constant BOOST_BUNDLE_ID = 1; 

    address public constant AAVE_MARKET = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;

    error WrongSubParams(uint128 minRatio, uint128 maxRatio);

    struct SubData {
        uint128 minRatio;
        uint128 maxRatio;
        uint128 optimalRatioBoost;
        uint128 optimalRatioRepay;
        bool boostEnabled;
    }

    /// @notice Gives DSProxy permission if needed and registers a new sub
    function subToAaveAutomation(
        bytes calldata encodedInput
    ) public {
        givePermission(PROXY_AUTH_ADDR);

        SubData memory subData = parseSubData(encodedInput);

        StrategySub memory repaySub = formatRepaySub(subData);
        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);

        if (subData.boostEnabled) {
            if (subData.minRatio > subData.maxRatio) {
                revert WrongSubParams(subData.minRatio, subData.maxRatio);
            }

            StrategySub memory boostSub = formatBoostSub(subData);
            SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
        }

    }

    /// @notice Calls SubStorage to update the users subscription data
    // TODO: MAKE SURE 0 subId isn't a valid one
    /// @dev Updating sub data will activate it as well
    function updateSubData(
        bytes calldata encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(encodedInput[0:8]);

        SubData memory subData = parseSubData(encodedInput[8:]);

        // validate
        if (subData.minRatio > subData.maxRatio) {
            revert WrongSubParams(subData.minRatio, subData.maxRatio);
        }

        // update repay as we must have a subId, it's ok if it's the same data
        StrategySub memory repaySub = formatRepaySub(subData);
        SubStorage(SUB_STORAGE_ADDR).updateSubData(subId1, repaySub);
        SubStorage(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subData.boostEnabled) {
            StrategySub memory boostSub = formatBoostSub(subData);
            SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);

            if (subId2 == 0) {
                SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(boostSub);
            } else {
                SubStorage(SUB_STORAGE_ADDR).updateSubData(subId2, boostSub);
                SubStorage(SUB_STORAGE_ADDR).activateSub(subId2);

            }
        }
    }

    function activateSub(
        bytes calldata encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(encodedInput[0:8]);

        SubStorage(SUB_STORAGE_ADDR).activateSub(subId1);

        if (subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).activateSub(subId2);
        }
    }


    function deactivateSub(
        bytes calldata encodedInput
    ) public {
        (uint32 subId1, uint32 subId2) = parseSubIds(encodedInput[0:8]);

        SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId1);

        if (subId2 != 0) {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(subId2);
        }
    }


    ///////////////////////////////// HELPER FUNCTIONS /////////////////////////////////

    function formatRepaySub(SubData memory _user) public view returns (StrategySub memory repaySub) {
        bytes memory triggerData = abi.encode(address(this), AAVE_MARKET, uint256(_user.minRatio), uint8(1));

        repaySub.strategyOrBundleId = REPAY_BUNDLE_ID;
        repaySub.isBundle = true;
        repaySub.triggerData =  new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData =  new bytes32[](3);
        repaySub.subData[0] = bytes32(uint256(_user.optimalRatioRepay));
        repaySub.subData[1] = bytes32(bytes1(0x01));
        repaySub.subData[2] = bytes32(0x00);
    }

    function formatBoostSub(SubData memory _user) public view returns (StrategySub memory repaySub) {
        bytes memory triggerData = abi.encode(address(this), AAVE_MARKET, uint256(_user.maxRatio), uint8(0));

        repaySub.strategyOrBundleId = BOOST_BUNDLE_ID;
        repaySub.isBundle = true;
        repaySub.triggerData = new bytes[](1);
        repaySub.triggerData[0] = triggerData;

        repaySub.subData =  new bytes32[](4);
        repaySub.subData[0] = bytes32(uint256(_user.optimalRatioRepay));
        repaySub.subData[1] = bytes32(bytes1(0x01));
        repaySub.subData[2] = bytes32(bytes1(0x00));
        repaySub.subData[3] = bytes32(bytes1(0x01));
    }

    function parseSubData(bytes calldata encodedInput) public pure returns (SubData memory user) {
        user.minRatio = uint128(bytes16(encodedInput[0:16]));
        user.maxRatio = uint128(bytes16(encodedInput[16:32]));
        user.optimalRatioBoost = uint128(bytes16(encodedInput[32:48]));
        user.optimalRatioRepay = uint128(bytes16(encodedInput[48:64]));
        user.boostEnabled = bytesToBool(bytes1(encodedInput[64:65]));
    }

    function parseSubIds(bytes calldata encodedInput) public pure returns (uint32 subId1, uint32 subId2) {
        subId1 = uint32(bytes4(encodedInput[0:4]));
        subId2 = uint32(bytes4(encodedInput[4:8]));
    }

    function bytesToBool(bytes1 x) internal pure returns (bool r) {
        return x != bytes1(0x00);
    }
}
