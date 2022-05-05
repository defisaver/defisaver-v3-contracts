// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../interfaces/curve/stethPool/ICurveStethPool.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

contract CurveStethPoolWithdraw is ActionBase {
    using TokenUtils for address;
    using SafeMath for uint256;

    address constant internal CURVE_STETH_POOL_ADDR = 0xDC24316b9AE028F1497c275EB9192a3Ea0f67022;
    address constant internal STE_CRV_ADDR = 0x06325440D014e39736583c165C2963BA99fAf14E;
    address constant internal STETH_ADDR = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

    enum ReturnValue {
        WETH,
        STETH,
        LP
    }

    struct Params {
        address from;           // address where to pull lp tokens from
        address to;             // address that will receive withdrawn tokens
        uint256[2] amounts;     // amount of each token to withdraw
        uint256 maxBurnAmount;  // max amount of LP tokens to burn
        ReturnValue returnValue;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.amounts[0] = _parseParamUint(params.amounts[0], _paramMapping[2], _subData, _returnValues);
        params.amounts[1] = _parseParamUint(params.amounts[1], _paramMapping[3], _subData, _returnValues);
        params.maxBurnAmount = _parseParamUint(params.maxBurnAmount, _paramMapping[4], _subData, _returnValues);

        (uint256 burnedLp, bytes memory logData) = _curveWithdraw(params);

        emit ActionEvent("CurveStethPoolWithdraw", logData);

        return bytes32(burnedLp);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _curveWithdraw(params);
        logger.logActionDirectEvent("CurveStethPoolWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws tokens from curve steth pool
    function _curveWithdraw(Params memory _params) internal returns (uint256 burnedLp, bytes memory logData) {
        require(_params.to != address(0), "to cant be 0x0");

        STE_CRV_ADDR.pullTokensIfNeeded(_params.from, _params.maxBurnAmount);
        STE_CRV_ADDR.approveToken(CURVE_STETH_POOL_ADDR, _params.maxBurnAmount);

        burnedLp = ICurveStethPool(CURVE_STETH_POOL_ADDR).remove_liquidity_imbalance(
            _params.amounts,
            _params.maxBurnAmount
        );

        if (_params.amounts[0] != 0) {
            TokenUtils.depositWeth(_params.amounts[0]);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.amounts[0]);
        }
        
        STETH_ADDR.withdrawTokens(_params.to, _params.amounts[1]);
        // return unburned lp tokens to from
        STE_CRV_ADDR.withdrawTokens(_params.from, _params.maxBurnAmount.sub(burnedLp));

        logData = abi.encode(_params.amounts[0], _params.amounts[1], burnedLp);

        if (_params.returnValue == ReturnValue.WETH) return (_params.amounts[0], logData);
        if (_params.returnValue == ReturnValue.STETH) return (_params.amounts[1], logData);

        return (burnedLp, logData);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}