// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../mcd/helpers/McdRatioHelper.sol";

/// @title Checks if ratio is in target range
contract McdRatioCheck is ActionBase, McdRatioHelper {

    // TODO: Maybe not be a constant?
    /// @dev 20% offset acceptable, used for testing
    uint256 internal constant RATIO_OFFSET = 500000000000000000;

    struct Params {
        uint256 ratioTarget;
        uint256 vaultId;
        uint256 nextPrice;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.ratioTarget = _parseParamUint(inputData.ratioTarget, _paramMapping[0], _subData, _returnValues);
        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[1], _subData, _returnValues);
        inputData.nextPrice = _parseParamUint(inputData.nextPrice, _paramMapping[2], _subData, _returnValues);

        uint256 currRatio = getRatio(inputData.vaultId, inputData.nextPrice);

        require(inAcceptableRange(currRatio, inputData.ratioTarget), "Ratio in non acceptable range");

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
