// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IBooster } from "../../interfaces/convex/IBooster.sol";
import { IBRewardPool } from "../../interfaces/convex/IBRewardPool.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ConvexHelper } from "./helpers/ConvexHelper.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Action that either withdraws(unwraps) Curve LP from convex, unstakes wrapped LP, or does both.
contract ConvexWithdraw is ConvexHelper, ActionBase {
    using TokenUtils for address;

    /// @param from address from which to pull wrapped LP tokens if option is UNWRAP,
    /// otherwise it is ignored and address(this) is used
    /// @param to address to which to withdraw wrapped LP tokens if option is UNSTAKE,
    /// otherwise LP tokens are withdrawn
    /// @param poolId curve pool id according to Convex Booster contract
    /// @param amount amount amount of tokens
    /// @param option WithdrawOption enum (UNWRAP, UNSTAKE, UNSTAKE_AND_UNWRAP)
    struct Params {
        address from;
        address to;
        uint256 poolId;
        uint256 amount;
        WithdrawOption option;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.poolId = _parseParamUint(params.poolId, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.option = WithdrawOption(_parseParamUint(uint8(params.option), _paramMapping[4], _subData, _returnValues));

        (uint256 transientAmount, bytes memory logData) = _withdraw(params);
        emit ActionEvent("ConvexWithdraw", logData);
        return bytes32(transientAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("ConvexWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _withdraw(Params memory _params) internal returns (uint256 transientAmount, bytes memory logData) {
        IBooster.PoolInfo memory poolInfo = IBooster(BOOSTER_ADDR).poolInfo(_params.poolId);

        if (_params.option == WithdrawOption.UNWRAP) {
            _params.amount = poolInfo.token.pullTokensIfNeeded(_params.from, _params.amount);
            IBooster(BOOSTER_ADDR).withdraw(_params.poolId, _params.amount);
            poolInfo.lpToken.withdrawTokens(_params.to, _params.amount);
        } else
        if (_params.option == WithdrawOption.UNSTAKE) {
            // cant unstake on behalf of other address 
            _params.from = address(this);
            // crvRewards implements balanceOf, but is not transferable, this is fine because from == address(this)
            _params.amount = poolInfo.crvRewards.pullTokensIfNeeded(_params.from, _params.amount);
            IBRewardPool(poolInfo.crvRewards).withdraw(_params.amount, false);
            poolInfo.token.withdrawTokens(_params.to, _params.amount);
        } else
        if (_params.option == WithdrawOption.UNSTAKE_AND_UNWRAP) {
            _params.from = address(this);
            _params.amount = poolInfo.crvRewards.pullTokensIfNeeded(_params.from, _params.amount);
            IBRewardPool(poolInfo.crvRewards).withdrawAndUnwrap(_params.amount, false);
            poolInfo.lpToken.withdrawTokens(_params.to, _params.amount);
        }

        transientAmount = _params.amount;
        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}