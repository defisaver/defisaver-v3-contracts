// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/MorphoBlueHelper.sol";

/// @title Withdraw a token to Morpho Blue market that is collateral
contract MorphoBlueWithdrawCollateral is ActionBase, MorphoBlueHelper {
    using TokenUtils for address;

    /// @param marketParams Market params of specified Morpho Blue market
    /// @param withdrawAmount The amount of assets to supply.
    /// @param onBehalf The address that owns the collateral position.
    /// @param to The address that will receive the collateral assets.
    struct Params {
        MarketParams marketParams;
        uint256 withdrawAmount;
        address onBehalf;
        address to;
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
        params.withdrawAmount = _parseParamUint(params.withdrawAmount, _paramMapping[5], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[6], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[7], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _withdraw(params);
        emit ActionEvent("MorphoBlueWithdrawCollateral", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("MorphoBlueWithdrawCollateral", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        // default to onBehalf of user's wallet
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }
        morphoBlue.withdrawCollateral(_params.marketParams, _params.withdrawAmount, _params.onBehalf, _params.to);

        bytes memory logData = abi.encode(_params);

        return (_params.withdrawAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}