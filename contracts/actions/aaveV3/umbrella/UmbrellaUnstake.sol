// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC4626 } from "../../../interfaces/IERC4626.sol";
import { IERC4626StakeToken } from "../../../interfaces/aaveV3/IERC4626StakeToken.sol";
import { IStaticATokenV2 } from "../../../interfaces/aaveV3/IStaticATokenV2.sol";
import { ActionBase } from "../../ActionBase.sol";
import { AaveV3Helper } from "../helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title UmbrellaUnstake - Unstake aTokens or GHO tokens using Umbrella Stake Token
/// @notice This action will always unwrap waTokens to aTokens after unstaking.
/// @notice Passing zero as amount will start cooldown period.
contract UmbrellaUnstake is ActionBase, AaveV3Helper  {
    using TokenUtils for address;

    error UmbrellaUnstakeSlippageHit(
        uint256 minOutOrMaxBurn,
        uint256 actualOutOrBurned
    );
 
    /// @param stkToken The umbrella stake token.
    /// @param to The address to which the aToken or GHO will be transferred
    /// @param amount The amount of aToken or GHO to be unstaked (max.uint to redeem whole balance, 0 to start cooldown period)
    /// @param minOutOrMaxBurn Two cases:
    ///                        1. For max redeem, it's the minimum amount of aTokens or GHO to be received
    ///                        2. For partial redeem, it's the max amount of stkToken shares to burn
    struct Params {
        address stkToken;
        address to;
        uint256 amount;
        uint256 minOutOrMaxBurn;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.stkToken = _parseParamAddr(params.stkToken, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.minOutOrMaxBurn = _parseParamUint(params.minOutOrMaxBurn, _paramMapping[3], _subData, _returnValues);

        (uint256 redeemedAmount, bytes memory logData) = _unstake(params);
        emit ActionEvent("UmbrellaUnstake", logData);
        return bytes32(redeemedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _unstake(params);
        logger.logActionDirectEvent("UmbrellaUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _unstake(Params memory _params) internal returns (uint256, bytes memory) {
        if (_shouldStartCooldown(_params.amount)) {
            IERC4626StakeToken(_params.stkToken).cooldown();
            return (0, abi.encode(_params, 0));
        }

        (uint256 amountUnstaked, bool isFullRedeem) = _unstakeWaTokensOrGHO(
            _params.stkToken,
            _params.amount,
            _params.minOutOrMaxBurn
        );

        amountUnstaked = _sendUnstakedTokens(
            _params.stkToken,
            _params.to,
            amountUnstaked
        );

        if (isFullRedeem && amountUnstaked < _params.minOutOrMaxBurn) {
            revert UmbrellaUnstakeSlippageHit(_params.minOutOrMaxBurn, amountUnstaked);
        }

        return (amountUnstaked, abi.encode(_params, amountUnstaked));
    }

    function _shouldStartCooldown(uint256 _amount) internal returns (bool) {
        return _amount == 0;
    }

    function _unstakeWaTokensOrGHO(
        address _stkToken,
        uint256 _amountToUnstake,
        uint256 _minOutOrMaxBurn
    ) internal returns (uint256 amountUnstaked, bool isFullRedeem) {
        if (_amountToUnstake == type(uint256).max) {
            amountUnstaked = IERC4626StakeToken(_stkToken).redeem(
                _stkToken.getBalance(address(this)),
                address(this), /* receiver */
                address(this) /* owner */
            );

            isFullRedeem = true;
            return (amountUnstaked, isFullRedeem);
        }

        uint256 sharesBurned = IERC4626StakeToken(_stkToken).withdraw(
            _amountToUnstake,
            address(this), /* receiver */
            address(this) /* owner */
        );

        if (sharesBurned > _minOutOrMaxBurn) {
            revert UmbrellaUnstakeSlippageHit(_minOutOrMaxBurn, sharesBurned);
        }

        amountUnstaked = _amountToUnstake;
        isFullRedeem = false;
    }

    function _sendUnstakedTokens(
        address _stkToken,
        address _to,
        uint256 _amountUnstaked
    ) internal returns (uint256 amountUnstaked) {
        address waTokenOrGHO = IERC4626(_stkToken).asset();

        if (waTokenOrGHO == GHO_TOKEN) {
            GHO_TOKEN.withdrawTokens(_to, _amountUnstaked);
            return _amountUnstaked;
        }

        uint256 aTokenAmount = IStaticATokenV2(waTokenOrGHO).redeemATokens(
            _amountUnstaked,
            address(this), /* receiver */
            address(this) /* owner */
        );

        IStaticATokenV2(waTokenOrGHO).aToken().withdrawTokens(_to, aTokenAmount);
        
        return aTokenAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}