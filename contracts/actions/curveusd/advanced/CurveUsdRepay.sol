// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "../helpers/CurveUsdHelper.sol";
import "./CurveUsdSwapper.sol";

/// @title CurveUsdRepay 
contract CurveUsdRepay is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param collAmount Amount of coll we're going to sell for crvUsd to repay debt
    /// @param to Where to send the leftover funds if full close
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
        uint256 collAmount;
        address to;
        uint256 minAmount;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[2], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _repay(params);
        emit ActionEvent("CurveUsdRepay", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _repay(params);
        logger.logActionDirectEvent("CurveUsdRepay", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _repay(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.collAmount == 0) revert();

        address curveUsdSwapper = registry.getAddr(CURVE_SWAPPER_ID);
        uint256[] memory swapData =
             _setupCurvePath(
                curveUsdSwapper,
                _params.additionalData,
                _params.collAmount,
                _params.minAmount,
                _params.gasUsed,
                _params.dfsFeeDivider
        );
        
        
        ICrvUsdController(_params.controllerAddress).repay_extended(curveUsdSwapper, swapData);

        // cleanup after the callback if any funds are left over
        CurveUsdSwapper(curveUsdSwapper).withdrawAll(_params.controllerAddress);

        // send funds to user
        _sendLeftoverFunds(_params.controllerAddress, _params.to);

        return (
            _params.collAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}