// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { McdRatioHelper } from "./helpers/McdRatioHelper.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Returns a ratio for mcd vault
contract McdRatio is ActionBase, McdRatioHelper {

    /// @param vaultId Id of the vault
    struct Params {
        uint256 vaultId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues);

        uint256 ratio = getRatio(inputData.vaultId, 0);

        return bytes32(ratio);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
