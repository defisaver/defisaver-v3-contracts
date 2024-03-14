// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";


/// @title Action that supplies collateral to a curveusd position
/// @dev collateralAmount must be non-zero, can be maxUint
contract CurveUsdSupply is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    error ZeroAmountSupplied();

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param onBehalfOf Address for which we are supplying, will default to user's wallet
    /// @param collateralAmount Amount of collateral asset to supply
    struct Params {
        address controllerAddress;
        address from;
        address onBehalfOf;
        uint256 collateralAmount;
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
        params.collateralAmount = _parseParamUint(params.collateralAmount, _paramMapping[3], _subData, _returnValues);

        (uint256 suppliedAmount, bytes memory logData) = _curveUsdSupply(params);
        emit ActionEvent("CurveUsdSupply", logData);
        return bytes32(suppliedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _curveUsdSupply(params);
        logger.logActionDirectEvent("CurveUsdSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _curveUsdSupply(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.collateralAmount == 0) revert ZeroAmountSupplied();
        
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();
        _params.collateralAmount = collateralAsset.pullTokensIfNeeded(_params.from, _params.collateralAmount);
        collateralAsset.approveToken(_params.controllerAddress, _params.collateralAmount);

        if (_params.onBehalfOf == address(0)) {
            ICrvUsdController(_params.controllerAddress).add_collateral(_params.collateralAmount);
        } else {
            ICrvUsdController(_params.controllerAddress).add_collateral(_params.collateralAmount, _params.onBehalfOf);
        }

        return (
            _params.collateralAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}