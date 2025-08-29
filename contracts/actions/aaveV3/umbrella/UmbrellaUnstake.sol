// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC4626 } from "../../../interfaces/IERC4626.sol";
import { IERC4626StakeToken } from "../../../interfaces/aaveV3/IERC4626StakeToken.sol";
import { IStaticATokenV2 } from "../../../interfaces/aaveV3/IStaticATokenV2.sol";
import { ActionBase } from "../../ActionBase.sol";
import { AaveV3Helper } from "../helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title UmbrellaUnstake - Unstake aTokens/underlying or GHO tokens using Umbrella Stake Token
/// @notice This action will always unwrap waTokens to aTokens/underlying after unstaking.
/// @notice Passing zero as amount will start cooldown period.
contract UmbrellaUnstake is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    error UmbrellaUnstakeSlippageHit(uint256 minAmountOut, uint256 actualAmountOut);

    /// @param stkToken The umbrella stake token.
    /// @param to The address to which the aToken/underlying or GHO will be transferred
    /// @param stkAmount The amount of stkToken shares to burn (max.uint to redeem whole balance, 0 to start cooldown period)
    /// @param useATokens Whether to unwrap waTokens to aTokens or underlying (e.g. aUSDC or USDC).
    /// @param minAmountOut The minimum amount of aToken/underlying or GHO to be received
    struct Params {
        address stkToken;
        address to;
        uint256 stkAmount;
        bool useATokens;
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

        params.stkToken = _parseParamAddr(params.stkToken, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.stkAmount = _parseParamUint(params.stkAmount, _paramMapping[2], _subData, _returnValues);
        params.useATokens = _parseParamUint(params.useATokens ? 1 : 0, _paramMapping[3], _subData, _returnValues) == 1;
        params.minAmountOut = _parseParamUint(params.minAmountOut, _paramMapping[4], _subData, _returnValues);

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
        if (_shouldStartCooldown(_params.stkAmount)) {
            IERC4626StakeToken(_params.stkToken).cooldown();
            return (0, abi.encode(_params, 0));
        }

        uint256 stkSharesToBurn =
            (_params.stkAmount == type(uint256).max) ? _params.stkToken.getBalance(address(this)) : _params.stkAmount;

        uint256 amountUnstaked = IERC4626StakeToken(_params.stkToken).redeem(
            stkSharesToBurn, address(this), /* receiver */ address(this) /* owner */
        );

        address waTokenOrGHO = IERC4626(_params.stkToken).asset();
        bool isGHOStaking = waTokenOrGHO == GHO_TOKEN;

        if (!isGHOStaking) {
            if (_params.useATokens) {
                amountUnstaked = IStaticATokenV2(waTokenOrGHO).redeemATokens(
                    amountUnstaked, address(this), /* receiver */ address(this) /* owner */
                );
            } else {
                amountUnstaked = IERC4626(waTokenOrGHO).redeem(
                    amountUnstaked, address(this), /* receiver */ address(this) /* owner */
                );
            }
        }

        if (amountUnstaked < _params.minAmountOut) {
            revert UmbrellaUnstakeSlippageHit(_params.minAmountOut, amountUnstaked);
        }

        if (isGHOStaking) {
            GHO_TOKEN.withdrawTokens(_params.to, amountUnstaked);
        } else {
            if (_params.useATokens) {
                IStaticATokenV2(waTokenOrGHO).aToken().withdrawTokens(_params.to, amountUnstaked);
            } else {
                IERC4626(waTokenOrGHO).asset().withdrawTokens(_params.to, amountUnstaked);
            }
        }

        return (amountUnstaked, abi.encode(_params, amountUnstaked));
    }

    function _shouldStartCooldown(uint256 _amount) internal pure returns (bool) {
        return _amount == 0;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
