// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/MorphoBlueHelper.sol";

/// @title Payback a token to Morpho Blue market
contract MorphoBluePayback is ActionBase, MorphoBlueHelper {
    using TokenUtils for address;

    /// @param marketParams Market params of specified Morpho Blue market
    /// @param paybackAmount The amount of tokens to payback (uint.max for full debt repayment)
    /// @param from The Address from which to pull tokens to be repaid
    /// @param onBehalf The address that will have its debt reduced
    struct Params {
        MarketParams marketParams;
        uint256 paybackAmount;
        address from;
        address onBehalf;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.marketParams.loanToken = _parseParamAddr(params.marketParams.loanToken , _paramMapping[0], _subData, _returnValues);
        params.marketParams.collateralToken = _parseParamAddr(params.marketParams.collateralToken , _paramMapping[1], _subData, _returnValues);
        params.marketParams.oracle = _parseParamAddr(params.marketParams.oracle , _paramMapping[2], _subData, _returnValues);
        params.marketParams.irm = _parseParamAddr(params.marketParams.irm , _paramMapping[3], _subData, _returnValues);
        params.marketParams.lltv = _parseParamUint(params.marketParams.lltv, _paramMapping[4], _subData, _returnValues);
        params.paybackAmount = _parseParamUint(params.paybackAmount, _paramMapping[5], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[6], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[7], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _payback(params);
        emit ActionEvent("MorphoBluePayback", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("MorphoBluePayback", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        // default to onBehalf of user's wallet
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }
        
        (uint256 currentDebt, uint256 borrowShares) = getCurrentDebt(_params.marketParams, _params.onBehalf);
        bool maxPayback;
        if (_params.paybackAmount > currentDebt){
            _params.paybackAmount = currentDebt;
            maxPayback = true;
        }
        _params.marketParams.loanToken.pullTokensIfNeeded(_params.from, _params.paybackAmount);
        _params.marketParams.loanToken.approveToken(address(morphoBlue), _params.paybackAmount);
        
        if (maxPayback){
            morphoBlue.repay(_params.marketParams, 0, borrowShares, _params.onBehalf, "");
        } else {
            morphoBlue.repay(_params.marketParams, _params.paybackAmount, 0, _params.onBehalf, "");
        }

        bytes memory logData = abi.encode(_params);

        return (_params.paybackAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}