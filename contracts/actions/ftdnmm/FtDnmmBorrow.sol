// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { FtDnmmHelper } from "./helpers/FtDnmmHelper.sol";

/// @title Borrow an asset from ftDNMM (PositionsManager.borrow)
/// @dev ftDNMM enforces borrow caps, the post-borrow health factor and wrapper circuit breaker.
///      Amounts are never silently capped to CB capacity; size recipes with FtDnmmView.
contract FtDnmmBorrow is ActionBase, FtDnmmHelper {
    using TokenUtils for address;

    /// @param asset The underlying asset to borrow
    /// @param amount The amount to borrow
    /// @param to The address which will receive the borrowed tokens (defaults to the wallet)
    struct Params {
        address asset;
        uint256 amount;
        address to;
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
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _borrow(params);
        emit ActionEvent("FtDnmmBorrow", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params);
        logger.logActionDirectEvent("FtDnmmBorrow", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _borrow(Params memory _params) internal returns (uint256, bytes memory) {
        // tokens are delivered to the wallet (msg.sender on PositionsManager)
        positionsManager.borrow(_params.asset, _params.amount);

        // forward to the final recipient if needed
        _params.asset.withdrawTokens(_params.to, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
