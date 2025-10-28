// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MorphoBlueHelper } from "../../actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { MarketParams } from "../../interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Action to check the ratio of the Morpho Blue position after strategy execution.
/// @notice This action only checks for current ratio, without comparing it to the start ratio.
contract MorphoBlueTargetRatioCheck is ActionBase, MorphoBlueHelper {
    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50_000_000_000_000_000;

    error BadAfterRatio(uint256 currentRatio, uint256 targetRatio);

    /// @param marketParams Morpho market parameters
    /// @param user User address that owns the position (EOA or proxy)
    /// @param targetRatio Target ratio
    struct Params {
        MarketParams marketParams;
        address user;
        uint256 targetRatio;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.marketParams.loanToken = _parseParamAddr(
            inputData.marketParams.loanToken, _paramMapping[0], _subData, _returnValues
        );
        inputData.marketParams.collateralToken = _parseParamAddr(
            inputData.marketParams.collateralToken, _paramMapping[1], _subData, _returnValues
        );
        inputData.marketParams.oracle = _parseParamAddr(
            inputData.marketParams.oracle, _paramMapping[2], _subData, _returnValues
        );
        inputData.marketParams.irm =
            _parseParamAddr(inputData.marketParams.irm, _paramMapping[3], _subData, _returnValues);
        inputData.marketParams.lltv =
            _parseParamUint(inputData.marketParams.lltv, _paramMapping[4], _subData, _returnValues);
        inputData.user = _parseParamAddr(inputData.user, _paramMapping[5], _subData, _returnValues);
        inputData.targetRatio =
            _parseParamUint(inputData.targetRatio, _paramMapping[6], _subData, _returnValues);

        uint256 currRatio = getRatioUsingParams(inputData.marketParams, inputData.user);

        if (
            currRatio > (inputData.targetRatio + RATIO_OFFSET)
                || currRatio < (inputData.targetRatio - RATIO_OFFSET)
        ) {
            revert BadAfterRatio(currRatio, inputData.targetRatio);
        }

        emit ActionEvent("MorphoBlueTargetRatioCheck", abi.encode(currRatio));
        return bytes32(currRatio);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
