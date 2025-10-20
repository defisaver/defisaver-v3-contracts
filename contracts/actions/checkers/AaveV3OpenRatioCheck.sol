// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { AaveV3RatioHelper } from "../aaveV3/helpers/AaveV3RatioHelper.sol";

/// @title Action to check the ratio of the Aave V3 position after strategy execution.
/// @notice This action only checks for current ratio, without comparing it to the start ratio.
contract AaveV3OpenRatioCheck is ActionBase, AaveV3RatioHelper {
    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 5e16;
    /// @notice We are checking for 5% RATIO_OFFSET only when the target ratio is < 999%
    uint256 internal constant RATIO_LIMIT = 999e16;

    error BadAfterRatio(uint256 currentRatio, uint256 targetRatio);

    /// @param targetRatio Target ratio.
    /// @param market Market address.
    /// @param user EOA or Smart Wallet address parameter that was added later in order to add support for EOA strategies.
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

        uint256 targetRatio = _parseParamUint(inputData.targetRatio, _paramMapping[0], _subData, _returnValues);
        address market = _parseParamAddr(inputData.market, _paramMapping[1], _subData, _returnValues);

        address user;
        /// @dev User param is added later, hence the check
        if (_paramMapping.length == 3) {
            user = _parseParamAddr(inputData.user, _paramMapping[2], _subData, _returnValues);
        }

        if (user == address(0)) user = address(this); // default to proxy

        uint256 currRatio = getRatio(market, user);

        /// @notice If `targetRatio` is 999% or more then skip `RATIO_OFFSET` check because it is very hard to be precise under 5%.
        if (targetRatio < RATIO_LIMIT) {
            if (currRatio > (targetRatio + RATIO_OFFSET) || currRatio < (targetRatio - RATIO_OFFSET)) {
                revert BadAfterRatio(currRatio, targetRatio);
            }
        }

        emit ActionEvent("AaveV3OpenRatioCheck", abi.encode(currRatio));
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
