// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import {
    IConfigPositionManager
} from "../../interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4RefreshPremium
/// @dev When refreshing the premium or dynamic reserve config on behalf of another address:
///      - ConfigPositionManager has to be enabled for 'onBehalf' address.
///      - Wallet itself has to be given approval to refresh the config on behalf of 'onBehalf' address.
contract AaveV4RefreshPremium is ActionBase, AaveV4Helper {
    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to refresh the config on behalf of. Defaults to the user's wallet if not provided.
    /// @param refreshDynamicReserveConfig Whether to also refresh the dynamic reserve config for all collateral reserves.
    struct Params {
        address spoke;
        address onBehalf;
        bool refreshDynamicReserveConfig;
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
        params.onBehalf =
            _parseParamAddr(params.onBehalf, _paramMapping[1], _subData, _returnValues);
        params.refreshDynamicReserveConfig =
            _parseParamUint(
                    params.refreshDynamicReserveConfig ? 1 : 0,
                    _paramMapping[2],
                    _subData,
                    _returnValues
                ) == 1;

        bytes memory logData = _refreshPremium(params);
        emit ActionEvent("AaveV4RefreshPremium", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _refreshPremium(params);
        logger.logActionDirectEvent("AaveV4RefreshPremium", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _refreshPremium(Params memory _params) internal returns (bytes memory logData) {
        ISpoke spoke = ISpoke(_params.spoke);
        _params.onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;

        bool refreshForSmartWallet = _params.onBehalf == address(this);

        if (refreshForSmartWallet) {
            if (_params.refreshDynamicReserveConfig) {
                spoke.updateUserDynamicConfig(_params.onBehalf);
            } else {
                spoke.updateUserRiskPremium(_params.onBehalf);
            }
        } else {
            IConfigPositionManager configPM = IConfigPositionManager(CONFIG_POSITION_MANAGER);
            if (_params.refreshDynamicReserveConfig) {
                configPM.updateUserDynamicConfigOnBehalfOf(_params.spoke, _params.onBehalf);
            } else {
                configPM.updateUserRiskPremiumOnBehalfOf(_params.spoke, _params.onBehalf);
            }
        }

        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
