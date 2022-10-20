// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Redeems ETH(wrapped) using LUSD with the target price of LUSD = 1$
contract LiquityRedeem is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param lusdAmount Amount of LUSD to redeem for
    /// @param from Address from which to pull LUSD
    /// @param to Address that will receive redeemed ETH
    /// @param firstRedemptionHint hints at the position of the first Trove that will be redeemed from,
    /// @param upperPartialRedemptionHint hints at the nextId neighbor of the last redeemed Trove upon reinsertion, if it's partially redeemed
    /// @param lowerPartialRedemptionHint hints at the prevId neighbor of the last redeemed Trove upon reinsertion, if it's partially redeemed
    /// @param partialRedemptionHintNICR  ensures that the transaction won't run out of gas if neither _lowerPartialRedemptionHint nor _upperPartialRedemptionHint are valid anymore
    /// @param maxIterations The number of Troves to consider for redemption can be capped by passing a non-zero value as _maxIterations, while passing zero will leave it uncapped
    /// @param maxFeePercentage The borrower has to provide a _maxFeePercentage that he/she is willing to accept in case of a fee slippage
    struct Params {
        uint256 lusdAmount;
        address from;
        address to;
        address firstRedemptionHint;
        address upperPartialRedemptionHint;
        address lowerPartialRedemptionHint;
        uint256 partialRedemptionHintNICR;
        uint256 maxIterations;
        uint256 maxFeePercentage;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.lusdAmount = _parseParamUint(
            params.lusdAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.maxFeePercentage = _parseParamUint(
            params.maxFeePercentage,
            _paramMapping[3],
            _subData,
            _returnValues
        );

        (uint256 ethRedeemed, bytes memory logData) = _liquityRedeem(params);
        emit ActionEvent("LiquityRedeem", logData);
        return bytes32(ethRedeemed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquityRedeem(params);
        logger.logActionDirectEvent("LiquityRedeem", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Redeems ETH(wrapped) using LUSD with the target price of LUSD = 1$
    /// @dev The address from which we are pulling LUSD must approve proxy to pull tokens
    /// @dev if lusdAmount is uint.max supply whole balance of LUSD
    function _liquityRedeem(Params memory _params) internal returns (uint256 ethRedeemed, bytes memory logData) {
        if (_params.lusdAmount == type(uint256).max) {
            _params.lusdAmount = LUSD_TOKEN_ADDRESS.getBalance(_params.from);
        }
        LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lusdAmount);

        uint256 lusdBefore = LUSD_TOKEN_ADDRESS.getBalance(address(this));
        uint256 ethBefore = address(this).balance;

        TroveManager.redeemCollateral(
            _params.lusdAmount,
            _params.firstRedemptionHint,
            _params.upperPartialRedemptionHint,
            _params.lowerPartialRedemptionHint,
            _params.partialRedemptionHintNICR,
            _params.maxIterations,
            _params.maxFeePercentage
        );

        uint256 lusdAmountUsed = lusdBefore - (LUSD_TOKEN_ADDRESS.getBalance(address(this)));   // It isn't guaranteed that the whole requested LUSD amount will be used
        uint256 lusdToReturn = _params.lusdAmount - lusdAmountUsed;
        ethRedeemed = address(this).balance -ethBefore;

        withdrawStaking(ethRedeemed, lusdToReturn, _params.to, _params.from);

        logData = abi.encode(
            lusdAmountUsed,
            ethRedeemed,
            _params.maxFeePercentage,
            _params.from,
            _params.to
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
