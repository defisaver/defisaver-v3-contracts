// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { CompV3RatioHelper } from "../compoundV3/helpers/CompV3RatioHelper.sol";
import { TransientStorage } from "../../utils/TransientStorage.sol";

/// @title Action to check the ratio of the Compound V3 position after strategy execution.
/// @notice This action only checks for current ratio, without comparing it to the start ratio.
contract CompV3TargetRatioCheck is ActionBase, CompV3RatioHelper {

    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error BadAfterRatio(uint256 currentRatio, uint256 targetRatio);

    /// @param targetRatio Target ratio.
    /// @param market Market address.
    /// @param user User address.   
    struct Params {
        uint256 targetRatio;
        address market;
        address user;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 targetRatio = _parseParamUint(uint256(inputData.targetRatio), _paramMapping[0], _subData, _returnValues);
        address market = _parseParamAddr(address(inputData.market), _paramMapping[1], _subData, _returnValues);
        address user = _parseParamAddr(address(inputData.user), _paramMapping[2], _subData, _returnValues);

        uint256 currRatio = getSafetyRatio(market, user);

        if (
            currRatio > (targetRatio + RATIO_OFFSET) ||
            currRatio < (targetRatio - RATIO_OFFSET)
        ) {
            revert BadAfterRatio(currRatio, targetRatio);
        }

        emit ActionEvent("CompV3TargetRatioCheck", abi.encode(currRatio));
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
