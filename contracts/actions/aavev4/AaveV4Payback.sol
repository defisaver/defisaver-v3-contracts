// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";

/// @title AaveV4Payback
contract AaveV4Payback is ActionBase {
    using TokenUtils for address;

    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to payback tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull the payback tokens.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to payback. Send type(uint).max to payback whole amount.
    struct Params {
        address spoke;
        address onBehalf;
        address from;
        uint256 reserveId;
        uint256 amount;
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
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.reserveId =
            _parseParamUint(params.reserveId, _paramMapping[3], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[4], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _payback(params);
        emit ActionEvent("AaveV4Payback", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("AaveV4Payback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        ISpoke spoke = ISpoke(_params.spoke);
        address underlying = spoke.getReserve(_params.reserveId).underlying;
        _params.onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;

        uint256 userDebt = spoke.getUserTotalDebt(_params.reserveId, _params.onBehalf);
        _params.amount = _params.amount > userDebt ? userDebt : _params.amount;

        underlying.pullTokensIfNeeded(_params.from, _params.amount);
        underlying.approveToken(_params.spoke, _params.amount);

        (, _params.amount) = spoke.repay(_params.reserveId, _params.amount, _params.onBehalf);

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
