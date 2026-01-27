// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";

/// @title AaveV4Supply
contract AaveV4Supply is ActionBase {
    using TokenUtils for address;

    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to supply tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull collateral asset.
    /// @param reserveId Reserve id.
    /// @param amount Amount of tokens to supply.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address spoke;
        address onBehalf;
        address from;
        uint256 reserveId;
        uint256 amount;
        bool useAsCollateral;
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
        params.useAsCollateral =
            _parseParamUint(
                    params.useAsCollateral ? 1 : 0, _paramMapping[5], _subData, _returnValues
                ) == 1;

        (uint256 amount, bytes memory logData) = _supply(params);
        emit ActionEvent("AaveV4Supply", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("AaveV4Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        ISpoke spoke = ISpoke(_params.spoke);
        address underlying = spoke.getReserve(_params.reserveId).underlying;
        _params.onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;

        _params.amount = underlying.pullTokensIfNeeded(_params.from, _params.amount);
        underlying.approveToken(_params.spoke, _params.amount);

        (, _params.amount) = spoke.supply(_params.reserveId, _params.amount, _params.onBehalf);

        if (_params.useAsCollateral) {
            spoke.setUsingAsCollateral(_params.reserveId, true, _params.onBehalf);
        }

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
