// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPendleRouter } from "../../interfaces/pendle/IPendleRouter.sol";
import { IPendleMarket } from "../../interfaces/pendle/IPendleMarket.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { PendleHelper } from "./helpers/PendleHelper.sol";

contract PendleTokenWrap is ActionBase, PendleHelper {
    using TokenUtils for address;

    error PendleSlippageHitError(uint256 amountReceived, uint256 minAmountExpected);

    struct Params {
        address market;
        address underlyingToken;
        address from;
        address to;
        uint256 underlyingAmount;
        uint256 minPtOut;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.underlyingToken = _parseParamAddr(params.underlyingToken, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);
        params.underlyingAmount = _parseParamUint(params.underlyingAmount, _paramMapping[4], _subData, _returnValues);
        params.minPtOut = _parseParamUint(params.minPtOut, _paramMapping[5], _subData, _returnValues);

        (uint256 ptAmountOut, bytes memory logData) = _wrap(params);
        emit ActionEvent("PendleTokenWrap", logData);
        return bytes32(ptAmountOut);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _wrap(params);
        logger.logActionDirectEvent("PendleTokenWrap", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _wrap(Params memory _params) internal returns (uint256, bytes memory) {
        (, address ptToken, ) = IPendleMarket(_params.market).readTokens();

        // Pull the underlying token from the user.
        _params.underlyingAmount = _params.underlyingToken.pullTokensIfNeeded(
            _params.from,
            _params.underlyingAmount
        );

        // Approve the router to spend the underlying token.
        _params.underlyingToken.approveToken(PENDLE_ROUTER, _params.underlyingAmount);

        // Prepare the data for the router.
        IPendleRouter.LimitOrderData memory limitOrderData;
        IPendleRouter.SwapData memory swapData;
        IPendleRouter.ApproxParams memory approxParams;

        IPendleRouter.TokenInput memory tokenInput = IPendleRouter.TokenInput({
            tokenIn: _params.underlyingToken,
            netTokenIn: _params.underlyingAmount,
            tokenMintSy: _params.underlyingToken,
            pendleSwap: address(0),
            swapData: swapData
        });

        // Take a snapshot before the swap.
        uint256 ptAmountBefore = IERC20(ptToken).balanceOf(address(this));

        // Perform the swap.
        IPendleRouter(PENDLE_ROUTER).swapExactTokenForPt(
            address(this), /* receiver */
            _params.market,
            _params.minPtOut,
            approxParams,
            tokenInput,
            limitOrderData
        );

        // Take a snapshot after the swap.
        uint256 ptAmountReceived = IERC20(ptToken).balanceOf(address(this)) - ptAmountBefore;

        // This will already be checked by the router but we add additional sanity check here.
        if (ptAmountReceived < _params.minPtOut) {
            revert PendleSlippageHitError(ptAmountReceived, _params.minPtOut);
        }

        return (ptAmountReceived, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
