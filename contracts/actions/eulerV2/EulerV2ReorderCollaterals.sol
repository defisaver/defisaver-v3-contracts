// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Reorder account collaterals. Can be used to optimize gas costs when checking account health status
contract EulerV2ReorderCollaterals is ActionBase, EulerV2Helper {

    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param indexes The array of swap steps to reorder collaterals
    struct Params {
        address account;
        uint8[][] indexes;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.account = _parseParamAddr(params.account, _paramMapping[0], _subData, _returnValues);

        bytes memory logData = _reorderCollaterals(params);
        emit ActionEvent("EulerV2ReorderCollaterals", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _reorderCollaterals(params);
        logger.logActionDirectEvent("EulerV2ReorderCollaterals", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _reorderCollaterals(Params memory _params) internal returns (bytes memory) {
        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        for (uint256 i = 0; i < _params.indexes.length; i++) {
            IEVC(EVC_ADDR).reorderCollaterals(
                _params.account,
                _params.indexes[i][0],
                _params.indexes[i][1]
            );
        }

        return abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}