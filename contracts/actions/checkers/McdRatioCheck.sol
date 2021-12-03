// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../mcd/helpers/McdRatioHelper.sol";
import "../../utils/TempStorage.sol";
import "../../core/helpers/CoreHelper.sol";

/// @title Checks if ratio is in target range
contract McdRatioCheck is ActionBase, McdRatioHelper {
    bytes4 constant TEMP_STORAGE_ID = bytes4(keccak256("TempStorage"));

    /// @dev 2% offset acceptable
    uint256 internal constant RATIO_OFFSET = 20000000000000000;

    enum RatioState {
        SHOULD_BE_LOWER,
        SHOULD_BE_HIGHER
    }

    struct Params {
        RatioState ratioState;
        bool checkTarget;
        uint256 ratioTarget;
        uint256 vaultId;
        uint256 nextPrice;
    }

    error RatioOutsideTargetRange(uint256, uint256);
    error RatioHigherThanBefore(uint256, uint256);
    error RatioLowerThanBefore(uint256, uint256);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 ratioState = _parseParamUint(uint256(inputData.ratioState), _paramMapping[0], _subData, _returnValues);
        inputData.ratioTarget = _parseParamUint(inputData.ratioTarget, _paramMapping[1], _subData, _returnValues);
        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[2], _subData, _returnValues);
        inputData.nextPrice = _parseParamUint(inputData.nextPrice, _paramMapping[3], _subData, _returnValues);

        uint256 currRatio = getRatio(inputData.vaultId, inputData.nextPrice);

        address tempStorageAddr = registry.getAddr(TEMP_STORAGE_ID);
        uint256 beforeRatio = uint256(TempStorage(tempStorageAddr).get("MCD_RATIO"));

        // ratio should be lower
        if (ratioState == 0 && beforeRatio < currRatio) {
            revert RatioHigherThanBefore(beforeRatio, currRatio);
        }

        // ratio should be higher
        if (ratioState == 1 && beforeRatio > currRatio) {
            revert RatioLowerThanBefore(beforeRatio, currRatio);
        }

        // if ratio target is sent check on it
        if (inputData.checkTarget) {
            if(!inAcceptableRange(currRatio, inputData.ratioTarget)) {
                revert RatioOutsideTargetRange(currRatio, inputData.ratioTarget);
            }
        }

        logger.Log(address(this), msg.sender, "McdRatioCheck", abi.encode(inputData, currRatio));

        return bytes32(inputData.ratioTarget);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function inAcceptableRange(uint256 _currRatio, uint256 _ratioTarget) internal pure returns (bool) {
        if (_currRatio > _ratioTarget + RATIO_OFFSET) return false;
        if (_currRatio < _ratioTarget - RATIO_OFFSET) return false;

        return true;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
