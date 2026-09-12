// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { FtDnmmHelper } from "./helpers/FtDnmmHelper.sol";

/// @title Supply an asset as collateral to ftDNMM (PositionsManager.deposit)
contract FtDnmmSupply is ActionBase, FtDnmmHelper {
    using TokenUtils for address;

    /// @param asset The underlying asset to deposit
    /// @param amount The amount to deposit (uint.max for whole balance of _from)
    /// @param from The address from which to pull tokens (address(0) defaults to the wallet)
    struct Params {
        address asset;
        uint256 amount;
        address from;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.asset = _parseParamAddr(params.asset, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _supply(params);
        emit ActionEvent("FtDnmmSupply", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("FtDnmmSupply", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        // default to pulling from the wallet itself
        if (_params.from == address(0)) {
            _params.from = address(this);
        }

        _params.amount = _params.asset.pullTokensIfNeeded(_params.from, _params.amount);

        _params.asset.approveToken(POSITIONS_MANAGER, _params.amount);
        positionsManager.deposit(_params.asset, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
