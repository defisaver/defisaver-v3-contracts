// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";

import "../../../interfaces/curve/ILiquidityGauge.sol";

contract CurveGaugeDeposit is ActionBase, CurveHelper {
    using TokenUtils for address;

    struct Params {
        address gaugeAddr;
        address lpToken;
        address sender;
        address onBehalfOf;
        uint256 amount;
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.sender = _parseParamAddr(params.sender, _paramMapping[0], _subData, _returnValues);
        params.onBehalfOf = _parseParamAddr(params.onBehalfOf, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);

        uint256 deposited = _curveGaugeDeposit(params);
        return bytes32(deposited);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _curveGaugeDeposit(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Dont forget NatSpec
    function _curveGaugeDeposit(Params memory _params) internal returns (uint256) {
        require(_params.onBehalfOf != address(0), "cant deposit on behalf of 0x0");
        // if _params.receiver != address(this) the receiver must call set_approve_deposit on gauge
        if (_params.amount == type(uint256).max) {
            _params.amount = _params.lpToken.getBalance(_params.sender);
        }
        _params.lpToken.pullTokensIfNeeded(_params.sender, _params.amount);
        _params.lpToken.approveToken(_params.gaugeAddr, _params.amount);
        ILiquidityGauge(_params.gaugeAddr).deposit(_params.amount, _params.onBehalfOf);
        
        logger.Log(
            address(this),
            msg.sender,
            "CurveGaugeDeposit",
            abi.encode(
                _params
            )
        );

        return _params.amount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}