// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { FtDnmmHelper } from "../ftdnmm/helpers/FtDnmmHelper.sol";
import { TransientStorage } from "../../utils/transient/TransientStorage.sol";

/// @title Action to check the account-wide ratio of an ftDNMM position after strategy execution.
contract FtDnmmRatioCheck is ActionBase, FtDnmmHelper {
    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 5e16;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE_CANCUN);

    error BadAfterRatio(uint256 startRatio, uint256 currRatio);

    enum RatioState {
        IN_BOOST,
        IN_REPAY
    }

    /// @param user User address (the smart wallet that owns the ftDNMM account).
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    struct Params {
        address user;
        RatioState ratioState;
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

        inputData.user = _parseParamAddr(inputData.user, _paramMapping[0], _subData, _returnValues);
        uint256 ratioState = _parseParamUint(
            uint256(inputData.ratioState), _paramMapping[1], _subData, _returnValues
        );
        uint256 targetRatio = _parseParamUint(
            uint256(inputData.targetRatio), _paramMapping[2], _subData, _returnValues
        );

        uint256 currRatio = getRatio(inputData.user);

        uint256 startRatio = uint256(tempStorage.getBytes32("FTDNMM_RATIO"));

        // if we are doing repay
        if (RatioState(ratioState) == RatioState.IN_REPAY) {
            // if repay ratio should be better off
            if (currRatio <= startRatio) {
                revert BadAfterRatio(startRatio, currRatio);
            }

            // can't repay too much over targetRatio so we don't trigger boost after
            if (currRatio > (targetRatio + RATIO_OFFSET)) {
                revert BadAfterRatio(startRatio, currRatio);
            }
        }

        // if we are doing boost
        if (RatioState(ratioState) == RatioState.IN_BOOST) {
            // if boost ratio should be less
            if (currRatio >= startRatio) {
                revert BadAfterRatio(startRatio, currRatio);
            }

            // can't boost too much under targetRatio so we don't trigger repay after
            if (currRatio < (targetRatio - RATIO_OFFSET)) {
                revert BadAfterRatio(startRatio, currRatio);
            }
        }

        emit ActionEvent("FtDnmmRatioCheck", abi.encode(currRatio));
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
