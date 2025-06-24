// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { LiquityV2RatioHelper } from "../liquityV2/helpers/LiquityV2RatioHelper.sol";

/// @title Action to check the ratio of the LiquityV2 position after strategy execution.
/// @notice This action only checks for current ratio, without comparing it to the start ratio.
contract LiquityV2TargetRatioCheck is ActionBase, LiquityV2RatioHelper {

    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    error BadAfterRatio(uint256 currentRatio, uint256 targetRatio);

    /// @param market Market address.
    /// @param troveId Trove ID.
    /// @param targetRatio Target ratio.
    struct Params {
        address market;
        uint256 troveId;
        uint256 targetRatio;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[1], _subData, _returnValues);
        params.targetRatio = _parseParamUint(params.targetRatio, _paramMapping[2], _subData, _returnValues);

        (uint256 currRatio,) = getRatio(params.market, params.troveId);
        
        if (
            currRatio > (params.targetRatio + RATIO_OFFSET) ||
            currRatio < (params.targetRatio - RATIO_OFFSET)
        ) {
            revert BadAfterRatio(currRatio, params.targetRatio);
        }

        emit ActionEvent("LiquityV2TargetRatioCheck", abi.encode(currRatio));
        return bytes32(currRatio);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }

}
