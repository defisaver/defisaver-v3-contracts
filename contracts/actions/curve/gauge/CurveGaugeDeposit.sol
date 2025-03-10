// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../../ActionBase.sol";
import { CurveHelper } from "../helpers/CurveHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

import { ILiquidityGauge } from "../../../interfaces/curve/ILiquidityGauge.sol";

/// @title Action that deposits LP tokens into a Liquidity Gauge.
contract CurveGaugeDeposit is ActionBase, CurveHelper {
    using TokenUtils for address;

    /// @param gaugeAddr Address of the gauge to deposit into
    /// @param lpToken Address of the LP token to deposit
    /// @param sender Address where the LP tokens are pulled from
    /// @param onBehalfOf Address of the deposit beneficiary
    /// @param amount Amount of LP tokens to deposit
    struct Params {
        address gaugeAddr;
        address lpToken;
        address sender;
        address onBehalfOf;
        uint256 amount;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.sender = _parseParamAddr(params.sender, _paramMapping[0], _subData, _returnValues);
        params.onBehalfOf = _parseParamAddr(params.onBehalfOf, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);

        (uint256 deposited, bytes memory logData) = _curveGaugeDeposit(params);
        emit ActionEvent("CurveGaugeDeposit", logData);
        return bytes32(deposited);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _curveGaugeDeposit(params);
        logger.logActionDirectEvent("CurveGaugeDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice if _params.receiver != address(this) the receiver must call set_approve_deposit on gauge
    function _curveGaugeDeposit(Params memory _params) internal returns (uint256, bytes memory) {
        require(_params.onBehalfOf != address(0), "cant deposit on behalf of 0x0");
        
        if (_params.amount == type(uint256).max) {
            _params.amount = _params.lpToken.getBalance(_params.sender);
        }
        _params.lpToken.pullTokensIfNeeded(_params.sender, _params.amount);
        _params.lpToken.approveToken(_params.gaugeAddr, _params.amount);
        ILiquidityGauge(_params.gaugeAddr).deposit(_params.amount, _params.onBehalfOf);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}