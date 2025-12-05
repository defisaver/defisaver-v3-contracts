// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TransientStorageCancun } from "../../utils/transient/TransientStorageCancun.sol";
import { AaveV4RatioHelper } from "./helpers/AaveV4RatioHelper.sol";

/// @title AaveV4StoreRatio
/// @notice Stores the ratio of the Aave V4 position in transient storage.
/// @notice This action is used for validating the ratio of the position after strategy execution.
contract AaveV4StoreRatio is ActionBase, AaveV4RatioHelper {
    TransientStorageCancun public constant tempStorage =
        TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);

    /// @param spoke Address of the spoke.
    /// @param user Address of the user.
    struct Params {
        address spoke;
        address user;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.spoke = _parseParamAddr(params.spoke, _paramMapping[0], _subData, _returnValues);
        params.user = _parseParamAddr(params.user, _paramMapping[1], _subData, _returnValues);

        uint256 ratio = getRatio(params.spoke, params.user);

        tempStorage.setBytes32(AAVE_V4_RATIO_KEY, bytes32(ratio));

        emit ActionEvent("AaveV4StoreRatio", abi.encode(params, ratio));

        return bytes32(ratio);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CUSTOM_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
