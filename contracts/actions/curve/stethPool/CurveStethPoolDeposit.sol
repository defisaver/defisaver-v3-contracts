// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ICurveStethPool } from "../../../interfaces/curve/stethPool/ICurveStethPool.sol";
import { CurveHelper } from "../helpers/CurveHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

contract CurveStethPoolDeposit is ActionBase, CurveHelper {
    using TokenUtils for address;

    struct Params {
        address from;           // address where to pull tokens from
        address to;             // address that will receive the LP tokens
        uint256[2] amounts;     // amount of each token to deposit
        uint256 minMintAmount;  // minimum amount of LP tokens to accept
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
        params.minMintAmount = _parseParamUint(params.minMintAmount, _paramMapping[4], _subData, _returnValues);

        (uint256 receivedLp, bytes memory logData) = _curveDeposit(params);
                
        emit ActionEvent("CurveStethPoolDeposit", logData);

        return bytes32(receivedLp);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _curveDeposit(params);
        logger.logActionDirectEvent("CurveStethPoolDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Deposits tokens into curve steth pool
    function _curveDeposit(Params memory _params) internal returns (uint256 receivedLp, bytes memory logData) {
        require(_params.to != address(0), "to cant be 0x0");

        if (_params.amounts[0] != 0) {
            _params.amounts[0] = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.amounts[0]);
            TokenUtils.withdrawWeth(_params.amounts[0]);
        }
        if (_params.amounts[1] != 0) {
            _params.amounts[1] = STETH_ADDR.pullTokensIfNeeded(_params.from, _params.amounts[1]);
            STETH_ADDR.approveToken(CURVE_STETH_POOL_ADDR, _params.amounts[1]);
        }
    
        receivedLp = ICurveStethPool(CURVE_STETH_POOL_ADDR).add_liquidity{
            value: _params.amounts[0]
        }(_params.amounts, _params.minMintAmount);

        STE_CRV_ADDR.withdrawTokens(_params.to, receivedLp);

        logData = abi.encode(_params.amounts[0], _params.amounts[1], receivedLp);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}