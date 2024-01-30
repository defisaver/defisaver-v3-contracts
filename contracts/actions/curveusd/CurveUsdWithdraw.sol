// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";


/// @title Action that withdraws collateral from user's wallet curveusd position
/// @dev collateralAmount must be non-zero
/// @dev if collateralAmount == uintMax will withdraw as much as the debt will allow
contract CurveUsdWithdraw is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    error ZeroAmountWithdraw();

    /// @param controllerAddress Address of the curveusd market controller
    /// @param to Address that will receive the withdrawn collateral, will default to user's wallet
    /// @param collateralAmount Amount of collateral to withdraw
    struct Params {
        address controllerAddress;
        address to;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.collateralAmount = _parseParamUint(params.collateralAmount, _paramMapping[2], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _curveUsdWithdraw(params);
        emit ActionEvent("CurveUsdWithdraw", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _curveUsdWithdraw(params);
        logger.logActionDirectEvent("CurveUsdWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _curveUsdWithdraw(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.collateralAmount == 0) revert ZeroAmountWithdraw();
 
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();
        
        /// @dev figure out if we need this calculated on-chain
        if (_params.collateralAmount == type(uint256).max) {
            _params.collateralAmount = userMaxWithdraw(_params.controllerAddress, address(this));
        }
        
        address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();
        if (collateralAsset != TokenUtils.WETH_ADDR){
            ICrvUsdController(_params.controllerAddress).remove_collateral(_params.collateralAmount);
        } else {
            ICrvUsdController(_params.controllerAddress).remove_collateral(_params.collateralAmount, false);
        }

        collateralAsset.withdrawTokens(_params.to, _params.collateralAmount);

        return (
            _params.collateralAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}