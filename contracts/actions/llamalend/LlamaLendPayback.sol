// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/LlamaLendHelper.sol";

/// @title Action that pays back debt asset to a llamalend position
/// @dev paybackAmount must be non-zero
/// @dev if paybackAmount >= debt will repay whole debt and close the position, transferring collateral
contract LlamaLendPayback is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    error ZeroAmountPayback();

    /// @param controllerAddress Address of the llamalend market controller
    /// @param from Address from which to pull debt asset, will default to user's wallet
    /// @param onBehalfOf Address for which we are paying back debt, will default to user's wallet
    /// @param to Address that will receive the debt asset and collateral asset if close, will default to user's wallet
    /// @param paybackAmount Amount of debt asset to payback
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

        (uint256 paybackAmount, bytes memory logData) = _llamaLendPayback(params);
        emit ActionEvent("LlamaLendPayback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _llamaLendPayback(params);
        logger.logActionDirectEvent("LlamaLendPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _llamaLendPayback(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.paybackAmount == 0) revert ZeroAmountPayback();

        if (_params.onBehalfOf == address(0)) _params.onBehalfOf = address(this);

        /// @dev debtAmount > debt is safe, need to make sure we dont pull more than needed
        /// @dev this also closes the position
        bool isClose;
        uint256 debt = ILlamaLendController(_params.controllerAddress).debt(_params.onBehalfOf);
        
        if (_params.paybackAmount >= debt) {
            _params.paybackAmount = debt;
            isClose = true;
        }

        address debtAsset = ILlamaLendController(_params.controllerAddress).borrowed_token();

        _params.paybackAmount = debtAsset.pullTokensIfNeeded(_params.from, _params.paybackAmount);
        debtAsset.approveToken(_params.controllerAddress, _params.paybackAmount);

        address collateralAsset = ILlamaLendController(_params.controllerAddress).collateral_token();


        uint256 startingBaseCollBalance;
        uint256 startingDebtAssetBalanceWithoutDebt;
        if (isClose) {
            startingBaseCollBalance = collateralAsset.getBalance(address(this));
            startingDebtAssetBalanceWithoutDebt = debtAsset.getBalance(address(this)) - debt;
        }

        ILlamaLendController(_params.controllerAddress).repay(_params.paybackAmount, _params.onBehalfOf, _params.maxActiveBand, false);
        
        uint256 baseReceivedFromColl;
        uint256 debtAssetReceivedFromColl;
        if (isClose) {
            baseReceivedFromColl = collateralAsset.getBalance(address(this)) - startingBaseCollBalance;
            debtAssetReceivedFromColl = debtAsset.getBalance(address(this)) - startingDebtAssetBalanceWithoutDebt;

            collateralAsset.withdrawTokens(_params.to, baseReceivedFromColl);
            debtAsset.withdrawTokens(_params.to, debtAssetReceivedFromColl);
        }

        return (
            _params.paybackAmount,
            abi.encode(_params, baseReceivedFromColl, debtAssetReceivedFromColl)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}