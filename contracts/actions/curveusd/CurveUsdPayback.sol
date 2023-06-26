// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ICrvUsdController, ICrvUsdControllerFactory, ILLAMMA } from "../../interfaces/curveusd/ICurveUsd.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";

/// @title Action that pays back crvUSD to a curveusd position
/// @dev debtAmount must be non-zero
/// @dev if debtAmount >= debt will repay whole debt and close the position, transferring collateral
contract CurveUsdPayback is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull crvUSD, will default to proxy
    /// @param onBehalfOf Address for which we are paying back debt, will default to proxy
    /// @param to Address that will receive the crvUSD and collateral asset if close, will default to proxy
    /// @param debtAmount Amount of crvUSD to payback
    /// @param maxActiveBand Don't allow active band to be higher than this (to prevent front-running the repay)
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        address to;
        uint256 debtAmount;
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
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[4], _subData, _returnValues);
        params.maxActiveBand = int256(_parseParamUint(uint256(params.maxActiveBand), _paramMapping[5], _subData, _returnValues));

        (uint256 generatedAmount, bytes memory logData) = _execute(params);
        emit ActionEvent("CurveUsdPayback", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _execute(params);
        logger.logActionDirectEvent("CurveUsdPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _execute(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.debtAmount == 0) revert();
        
        /// @dev one of the few ways we can check if the controller address is an actual controller
        if (ICrvUsdControllerFactory(CRVUSD_CONTROLLER_FACTORY_ADDR).debt_ceiling(_params.controllerAddress) == 0) revert CurveUsdInvalidController();

        if (_params.onBehalfOf == address(0)) _params.onBehalfOf = address(this);

        /// @dev debtAmount > debt is safe, need to make sure we don't pull more than needed
        /// @dev this also closes the position
        bool isClose;
        uint256 closeCrvUsdAmount;
        uint256 closeCollateralAmount;
        uint256 debt = ICrvUsdController(_params.controllerAddress).debt(_params.onBehalfOf);
        if (_params.debtAmount >= debt) {
            _params.debtAmount = debt;
            isClose = true;

            address llammaAddress = ICrvUsdController(_params.controllerAddress).amm();
            uint256[2] memory xy = ILLAMMA(llammaAddress).get_sum_xy(address(this));
            closeCrvUsdAmount = xy[0];
            closeCollateralAmount = xy[1];
        }

        _params.debtAmount = CRVUSD_TOKEN_ADDR.pullTokensIfNeeded(_params.from, _params.debtAmount);
        CRVUSD_TOKEN_ADDR.approveToken(_params.controllerAddress, _params.debtAmount);

        ICrvUsdController(_params.controllerAddress).repay(_params.debtAmount, _params.onBehalfOf, _params.maxActiveBand);

        if (isClose) {
            address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();
            collateralAsset.withdrawTokens(_params.to, closeCollateralAmount);
            CRVUSD_TOKEN_ADDR.withdrawTokens(_params.to, closeCrvUsdAmount);
        }

        /// @dev figure out what to return here, as this action can also close, transfering tokens
        return (
            _params.debtAmount,
            abi.encode(_params, closeCollateralAmount, closeCrvUsdAmount)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}