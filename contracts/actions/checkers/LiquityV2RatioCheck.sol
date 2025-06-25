// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { LiquityV2RatioHelper } from "../liquityV2/helpers/LiquityV2RatioHelper.sol";
import { TransientStorage } from "../../utils/TransientStorage.sol";

/// @title Action to check the ratio of the Liquity V2 position after strategy execution.
contract LiquityV2RatioCheck is ActionBase, LiquityV2RatioHelper {

    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error BadAfterRatio(uint256 startRatio, uint256 currRatio);

    enum RatioState {
        IN_BOOST,
        IN_REPAY
    }

    /// @param market Market address.
    /// @param troveId Trove ID.
    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    struct Params {
        address market;
        uint256 troveId;
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
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[1], _subData, _returnValues);
        params.ratioState = RatioState(
            _parseParamUint(uint256(params.ratioState), _paramMapping[2], _subData, _returnValues)
        );
        params.targetRatio = _parseParamUint(params.targetRatio, _paramMapping[3], _subData, _returnValues);

        (uint256 currRatio,) = getRatio(params.market, params.troveId);
        uint256 startRatio = uint256(tempStorage.getBytes32("LIQUITY_V2_RATIO"));
        
        // if we are doing repay
        if (RatioState(params.ratioState) == RatioState.IN_REPAY) {
            // repay ratio should be better off
            if (currRatio <= startRatio) {
                revert BadAfterRatio(startRatio, currRatio);
            }

            // can't repay too much over targetRatio so we don't trigger boost after
            if (currRatio > (params.targetRatio + RATIO_OFFSET)) {
                revert BadAfterRatio(startRatio, currRatio);
            }
        }

        // if we are doing boost
        if (RatioState(params.ratioState) == RatioState.IN_BOOST) {
            // boost ratio should be less than start ratio
            if (currRatio >= startRatio) {
                revert BadAfterRatio(startRatio, currRatio);
            }

            // can't boost too much under targetRatio so we don't trigger repay after
            if (currRatio < (params.targetRatio - RATIO_OFFSET)) {
                revert BadAfterRatio(startRatio, currRatio);
            }
        }

        emit ActionEvent("LiquityV2RatioCheck", abi.encode(currRatio));
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
