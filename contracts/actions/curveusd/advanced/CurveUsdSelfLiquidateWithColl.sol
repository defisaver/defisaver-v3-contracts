// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "../helpers/CurveUsdHelper.sol";
import "./CurveUsdSwapper.sol";

contract CurveUsdSelfLiquidateWithColl is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param percentage Fraction to liquidate; 100% = 10**18
    /// @param minCrvUsdExpected Users crvUsd collateral balance must be bigger than this
    /// @param swapAmount Amount of collateral to swap for crvUsd
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param to Where to send the leftover funds if full close
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
        uint256 percentage; // Fraction to liquidate; 100% = 10**18
        uint256 minCrvUsdExpected;
        uint256 swapAmount;
        uint256 minAmount;
        address to;
        bytes additionalData;
        uint32 gasUsed;
        uint24 dfsFeeDivider;
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
        params.percentage = _parseParamUint(params.percentage, _paramMapping[1], _subData, _returnValues);
        params.minCrvUsdExpected = _parseParamUint(params.minCrvUsdExpected, _paramMapping[2], _subData, _returnValues);
        params.swapAmount = _parseParamUint(params.swapAmount, _paramMapping[3], _subData, _returnValues);
        params.minAmount = _parseParamUint(params.minAmount, _paramMapping[4], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[5], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _liquidate(params);
        emit ActionEvent("CurveUsdSelfLiquidateWithColl", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquidate(params);
        logger.logActionDirectEvent("CurveUsdSelfLiquidateWithColl", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _liquidate(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.swapAmount == 0) revert();

        address curveUsdSwapper = registry.getAddr(CURVE_SWAPPER_ID);

        uint256[] memory swapData =
             _setupCurvePath(
                curveUsdSwapper,
                _params.additionalData,
                _params.swapAmount,
                _params.minAmount,
                _params.gasUsed,
                _params.dfsFeeDivider
            );
        
        ICrvUsdController(_params.controllerAddress)
            .liquidate_extended(address(this), _params.minCrvUsdExpected, _params.percentage, false, curveUsdSwapper, swapData);


        // cleanup after the callback if any funds are left over
        CurveUsdSwapper(curveUsdSwapper).withdrawAll(_params.controllerAddress);

        // send funds to user
        _sendLeftoverFunds(_params.controllerAddress, _params.to);

        return (
            _params.percentage,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}