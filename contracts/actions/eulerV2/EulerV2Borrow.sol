// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IBorrowing } from "../../interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Borrow assets from Euler vault
contract EulerV2Borrow is ActionBase, EulerV2Helper {

    /// @param vault The address of the Euler vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param receiver The address to receive the borrowed assets
    /// @param amount The amount of assets to borrow
    /// @param enableAsController Whether to enable borrow vault as controller. Can be skipped only if the vault is already enabled as controller
    struct Params {
        address vault;
        address account;
        address receiver;
        uint256 amount;
        bool enableAsController;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.vault = _parseParamAddr(params.vault, _paramMapping[0], _subData, _returnValues);
        params.account = _parseParamAddr(params.account, _paramMapping[1], _subData, _returnValues);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.enableAsController = _parseParamUint(
            params.enableAsController ? 1 : 0,
            _paramMapping[4],
            _subData,
            _returnValues
        ) == 1;

        (uint256 borrowAmount, bytes memory logData) = _borrow(params);
        emit ActionEvent("EulerV2Borrow", logData);
        return bytes32(borrowAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params);
        logger.logActionDirectEvent("EulerV2Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _borrow(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        if(_params.enableAsController) {
            IEVC(EVC_ADDR).enableController(_params.account, _params.vault);
        }

        bytes memory borrowCallData = abi.encodeCall(
            IBorrowing.borrow,
            (_params.amount, _params.receiver)
        );

        bytes memory result = IEVC(EVC_ADDR).call(
            _params.vault,
            _params.account,
            0,
            borrowCallData
        );

        _params.amount = abi.decode(result, (uint256));

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}