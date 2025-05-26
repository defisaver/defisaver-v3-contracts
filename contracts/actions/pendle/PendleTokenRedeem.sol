// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPendleYieldToken } from "../../interfaces/pendle/IPendleYieldToken.sol";
import { ISyToken } from "../../interfaces/pendle/ISyToken.sol";
import { IPendleMarket } from "../../interfaces/pendle/IPendleMarket.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";
import { SafeERC20 } from "../../utils/SafeERC20.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title PendleTokenRedeem -> Redeems PT tokens for underlying tokens after maturity. E.g PT-eUSDE-{date} -> eUSDE
/// @notice This action performs two steps:
/// 1. First convert PT token to SY token
/// 2. Then convert SY token to underlying tokens
/// @dev Execution will revert if the market is not expired
contract PendleTokenRedeem is ActionBase {
    using TokenUtils for address;
    using SafeERC20 for IERC20;

    error MarketNotExpired();
    error ZeroAddressReceiver();

    /// @param market The address of the Pendle market
    /// @param underlyingToken The address of the underlying token
    /// @param from The address from where the PT tokens will be pulled
    /// @param to The address of the recipient to receive the underlying tokens
    /// @param ptAmount The amount of PT tokens to redeem
    /// @param minAmountOut The minimum amount of underlying tokens to receive
    struct Params {
        address market;
        address underlyingToken;
        address from;
        address to;
        uint256 ptAmount;
        uint256 minAmountOut;
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
        params.ptAmount = _parseParamUint(params.ptAmount, _paramMapping[4], _subData, _returnValues);
        params.minAmountOut = _parseParamUint(params.minAmountOut, _paramMapping[5], _subData, _returnValues);

        (uint256 underlyingAmount, bytes memory logData) = _redeem(params);
        emit ActionEvent("PendleTokenRedeem", logData);
        return bytes32(underlyingAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _redeem(params);
        logger.logActionDirectEvent("PendleTokenRedeem", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _redeem(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.to == address(0)) revert ZeroAddressReceiver();

        (address syToken, address ptToken, address ytToken) = IPendleMarket(_params.market).readTokens();

        // only redeem if the market has expired
        if (!IPendleMarket(_params.market).isExpired()) revert MarketNotExpired();

        _params.ptAmount = ptToken.pullTokensIfNeeded(_params.from, _params.ptAmount);

        // PT tokens needs to be transferred directly to YT before calling redeemPY
        IERC20(ptToken).safeTransfer(ytToken, _params.ptAmount);

        // Redeem PY tokens to SY tokens
        uint256 amountSyOut = IPendleYieldToken(ytToken).redeemPY(address(this));

        // Redeem SY tokens to underlying tokens
        uint256 underlyingAmountOut = ISyToken(syToken).redeem(
            _params.to,
            amountSyOut,
            _params.underlyingToken,
            _params.minAmountOut,
            false
        );

        return (underlyingAmountOut, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}