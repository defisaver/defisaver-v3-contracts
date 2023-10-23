// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../liquity/helpers/LiquityRatioHelper.sol";
import "../../utils/TransientStorage.sol";

contract LiquityRatioIncreaseCheck is ActionBase, LiquityRatioHelper {

    /// @dev 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error BadAfterRatio(uint256 startRatio, uint256 currRatio);

    struct Params {
        uint256 targetRatioIncrease;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 targetRatioIncrease = _parseParamUint(uint256(inputData.targetRatioIncrease), _paramMapping[0], _subData, _returnValues);

        address troveOwner = address(this);

        (uint256 currRatio,) = getRatio(troveOwner);

        uint256 targetRatio = currRatio + targetRatioIncrease;

        uint256 startRatio = uint256(tempStorage.getBytes32("LIQUITY_RATIO"));
        
        // if repay ratio should be better off
        if (currRatio <= startRatio) {
            revert BadAfterRatio(startRatio, currRatio);
        }

        // can't repay too much over targetRatio
        if (currRatio > (targetRatio + RATIO_OFFSET)) {
            revert BadAfterRatio(startRatio, currRatio);
        }

        emit ActionEvent("LiquityRatioIncreaseCheck", abi.encode(currRatio));
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
