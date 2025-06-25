// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../../ActionBase.sol";
import { CurveHelper } from "../helpers/CurveHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

import { ILiquidityGauge } from "../../../interfaces/curve/ILiquidityGauge.sol";

/// @title Action that withdraws LP tokens from a Liquidity Gauge.
contract CurveGaugeWithdraw is ActionBase, CurveHelper {
    using TokenUtils for address;

    /// @param gaugeAddr Address of the gauge to withdraw from
    /// @param lpToken Address of the LP token to withdraw
    /// @param receiver Address that will receive the withdrawn tokens
    /// @param amount Amount of LP tokens to withdraw
    struct Params {
        address gaugeAddr;
        address lpToken;
        address receiver;
        uint256 amount;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);

        (uint256 withdrawn, bytes memory logData) = _curveGaugeWithdraw(params);
        emit ActionEvent("CurveGaugeWithdraw", logData);
        return bytes32(withdrawn);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _curveGaugeWithdraw(params);
        logger.logActionDirectEvent("CurveGaugeWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _curveGaugeWithdraw(Params memory _params) internal returns (uint256, bytes memory) {
        require(_params.receiver != address(0), "receiver cant be 0x0");
        
        if (_params.amount == type(uint256).max) {
            _params.amount = ILiquidityGauge(_params.gaugeAddr).balanceOf(address(this));
        }

        ILiquidityGauge(_params.gaugeAddr).withdraw(_params.amount);
        _params.lpToken.withdrawTokens(_params.receiver, _params.amount);

        bytes memory logData =  abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}