// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ICurveStethPool } from "../../../interfaces/curve/stethPool/ICurveStethPool.sol";
import { CurveHelper } from "../helpers/CurveHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action that withdraws tokens from the Curve steth pool
contract CurveStethPoolWithdraw is ActionBase, CurveHelper {
    using TokenUtils for address;

    enum ReturnValue {
        WETH,
        STETH,
        LP
    }

    /// @param from Address where to pull lp tokens from
    /// @param to Address that will receive the withdrawn tokens
    /// @param amounts Amount of each token to withdraw
    /// @param maxBurnAmount Max amount of LP tokens to burn
    /// @param returnValue Type of token to return (WETH, STETH, LP)
    struct Params {
        address from;
        address to;
        uint256[2] amounts;
        uint256 maxBurnAmount;
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

    function _curveWithdraw(Params memory _params) internal returns (uint256 burnedLp, bytes memory logData) {
        require(_params.to != address(0), "to cant be 0x0");

        STE_CRV_ADDR.pullTokensIfNeeded(_params.from, _params.maxBurnAmount);

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
        STE_CRV_ADDR.withdrawTokens(_params.from, _params.maxBurnAmount - (burnedLp));

        logData = abi.encode(_params.amounts[0], _params.amounts[1], burnedLp);

        if (_params.returnValue == ReturnValue.WETH) return (_params.amounts[0], logData);
        if (_params.returnValue == ReturnValue.STETH) return (_params.amounts[1], logData);

        return (burnedLp, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}