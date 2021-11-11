// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityRedeem is ActionBase, LiquityHelper {
    using TokenUtils for address;

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

        uint256 ethRedeemed = _liquityRedeem(params);
        return bytes32(ethRedeemed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquityRedeem(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Redeems ETH(wrapped) using LUSD with the target price of LUSD = 1$
    function _liquityRedeem(Params memory _params) internal returns (uint256) {
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
        uint256 ethRedeemed = address(this).balance -ethBefore;

        withdrawStaking(ethRedeemed, lusdToReturn, _params.to, _params.from);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityRedeem",
            abi.encode(
                lusdAmountUsed,
                ethRedeemed,
                _params.maxFeePercentage,
                _params.from,
                _params.to
            )
        );

        return ethRedeemed;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
