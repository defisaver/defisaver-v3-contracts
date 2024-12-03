// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IEVault } from "../../interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Supply assets to a Euler vault and gets eTokens vault shares
contract EulerV2Supply is ActionBase, EulerV2Helper {
    using TokenUtils for address;

    /// @param vault The address of the supply vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param from The address from which to pull tokens to be supplied
    /// @param amount The amount of assets to supply
    /// @param enableAsColl Whether to enable supply vault as collateral
    struct Params {
        address vault;
        address account;
        address from;
        uint256 amount;
        bool enableAsColl;
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
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.enableAsColl = _parseParamUint(params.enableAsColl ? 1 : 0, _paramMapping[4], _subData, _returnValues) == 1;
   
        (uint256 supplyAmount, bytes memory logData) = _supply(params);
        emit ActionEvent("EulerV2Supply", logData);
        return bytes32(supplyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("EulerV2Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        address assetAddr = IEVault(_params.vault).asset();

        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        _params.amount = assetAddr.pullTokensIfNeeded(_params.from, _params.amount);

        assetAddr.approveToken(_params.vault, _params.amount);

        IEVault(_params.vault).deposit(_params.amount, _params.account);

        if (_params.enableAsColl) {
            IEVC(EVC_ADDR).enableCollateral(_params.account, _params.vault);
        }

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}