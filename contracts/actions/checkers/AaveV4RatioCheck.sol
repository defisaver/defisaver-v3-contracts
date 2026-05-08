// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TransientStorageCancun } from "../../utils/transient/TransientStorageCancun.sol";
import { AaveV4RatioHelper } from "../aaveV4/helpers/AaveV4RatioHelper.sol";

/// @title AaveV4RatioCheck
/// @notice Checks the ratio of the Aave V4 position after strategy execution.
contract AaveV4RatioCheck is ActionBase, AaveV4RatioHelper {
    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 5e16;

    TransientStorageCancun public constant tempStorage =
        TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);

    error BadAfterRatio(uint256 startRatio, uint256 currRatio);

    enum RatioState {
        IN_BOOST,
        IN_REPAY
    }

    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    /// @param spoke Aave V4 spoke address.
    /// @param user User address.
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
        address spoke;
        address user;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.ratioState = RatioState(
            _parseParamUint(uint8(params.ratioState), _paramMapping[0], _subData, _returnValues)
        );
        params.targetRatio =
            _parseParamUint(params.targetRatio, _paramMapping[1], _subData, _returnValues);
        params.spoke = _parseParamAddr(params.spoke, _paramMapping[2], _subData, _returnValues);
        params.user = _parseParamAddr(params.user, _paramMapping[3], _subData, _returnValues);

        uint256 current = getRatio(params.spoke, params.user);
        uint256 start = uint256(tempStorage.getBytes32(AAVE_V4_RATIO_KEY));

        if (params.ratioState == RatioState.IN_REPAY) {
            // Repay: Ratio must increase but not overshoot 'target + offset' to avoid boost after.
            if (current <= start || current > params.targetRatio + RATIO_OFFSET) {
                revert BadAfterRatio(start, current);
            }
        } else {
            // Boost: Ratio must decrease but not undershoot 'target - offset' to avoid repay after.
            if (current >= start || current < params.targetRatio - RATIO_OFFSET) {
                revert BadAfterRatio(start, current);
            }
        }

        emit ActionEvent("AaveV4RatioCheck", abi.encode(current));
        return bytes32(current);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
