// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IActionBase {
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) external payable returns (bytes32);

    function executeActionDirect(bytes memory _callData) external payable;

    function actionType() external pure returns (uint8);
}
