// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { AaveV3RatioHelper } from "../aaveV3/helpers/AaveV3RatioHelper.sol";

contract AaveV3OpenRatioCheck is ActionBase, AaveV3RatioHelper {

    /// @dev 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 50000000000000000;

    error BadAfterRatio(uint256 currentRatio, uint256 targetRatio);

    struct Params {
        uint256 targetRatio;
        address market;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 targetRatio = _parseParamUint(inputData.targetRatio, _paramMapping[0], _subData, _returnValues);
        address market = _parseParamAddr(inputData.market, _paramMapping[1], _subData, _returnValues);

        uint256 currRatio = getRatio(market, address(this));

        if (currRatio > (targetRatio + RATIO_OFFSET) || currRatio < (targetRatio - RATIO_OFFSET)) {
            revert BadAfterRatio(currRatio, targetRatio);
        }

        emit ActionEvent("AaveV3OpenRatioCheck", abi.encode(currRatio));
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
