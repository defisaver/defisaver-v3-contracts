// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";

/// @title Action that pays back crvUSD to a curveusd position
/// @dev paybackAmount must be non-zero
/// @dev if paybackAmount >= debt will repay whole debt and close the position, transferring collateral
contract CurveUsdPayback is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    error ZeroAmountPayback();

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull crvUSD, will default to user's wallet
    /// @param onBehalfOf Address for which we are paying back debt, will default to user's wallet
    /// @param to Address that will receive the crvUSD and collateral asset if close, will default to user's wallet
    /// @param paybackAmount Amount of crvUSD to payback
    /// @param maxActiveBand Don't allow active band to be higher than this (to prevent front-running the repay)
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        address to;
        uint256 paybackAmount;
        int256 maxActiveBand;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.controllerAddress = _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.onBehalfOf = _parseParamAddr(params.onBehalfOf, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);
        params.paybackAmount = _parseParamUint(params.paybackAmount, _paramMapping[4], _subData, _returnValues);
        params.maxActiveBand = int256(_parseParamUint(uint256(params.maxActiveBand), _paramMapping[5], _subData, _returnValues));

        (uint256 paybackAmount, bytes memory logData) = _curveUsdPayback(params);
        emit ActionEvent("CurveUsdPayback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _curveUsdPayback(params);
        logger.logActionDirectEvent("CurveUsdPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _curveUsdPayback(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.paybackAmount == 0) revert ZeroAmountPayback();
        
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        if (_params.onBehalfOf == address(0)) _params.onBehalfOf = address(this);

        /// @dev debtAmount > debt is safe, need to make sure we dont pull more than needed
        /// @dev this also closes the position
        bool isClose;
        uint256 debt = ICrvUsdController(_params.controllerAddress).debt(_params.onBehalfOf);
        
        if (_params.paybackAmount >= debt) {
            _params.paybackAmount = debt;
            isClose = true;
        }

        _params.paybackAmount = CRVUSD_TOKEN_ADDR.pullTokensIfNeeded(_params.from, _params.paybackAmount);
        CRVUSD_TOKEN_ADDR.approveToken(_params.controllerAddress, _params.paybackAmount);

        address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();


        uint256 startingBaseCollBalance;
        uint256 startingCrvUsdBalanceWithoutDebt;
        if (isClose) {
            startingBaseCollBalance = collateralAsset.getBalance(address(this));
            startingCrvUsdBalanceWithoutDebt = CRVUSD_TOKEN_ADDR.getBalance(address(this)) - debt;
        }

        ICrvUsdController(_params.controllerAddress).repay(_params.paybackAmount, _params.onBehalfOf, _params.maxActiveBand, false);
        
        uint256 baseReceivedFromColl;
        uint256 crvUsdReceivedFromColl;
        if (isClose) {
            baseReceivedFromColl = collateralAsset.getBalance(address(this)) - startingBaseCollBalance;
            crvUsdReceivedFromColl = CRVUSD_TOKEN_ADDR.getBalance(address(this)) - startingCrvUsdBalanceWithoutDebt;

            collateralAsset.withdrawTokens(_params.to, baseReceivedFromColl);
            CRVUSD_TOKEN_ADDR.withdrawTokens(_params.to, crvUsdReceivedFromColl);
        }

        return (
            _params.paybackAmount,
            abi.encode(_params, baseReceivedFromColl, crvUsdReceivedFromColl)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}