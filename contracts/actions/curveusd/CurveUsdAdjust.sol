// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";

/// @title Action that supplies collateral to a curveusd position and borrows more crvUSD
/// @dev will always adjust only user's wallet position, can't adjust on behalf of someone else
contract CurveUsdAdjust is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    error ZeroAmountBorrowed();

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param to Address which will receive borrowed crvUSD
    /// @param supplyAmount Amount of collateral asset to supply (uint.max supported)
    /// @param borrowAmount Amount of debt asset to borrow (uint.max not supported)
    struct Params {
        address controllerAddress;
        address from;
        address to;
        uint256 supplyAmount;
        uint256 borrowAmount;
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
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.supplyAmount = _parseParamUint(params.supplyAmount, _paramMapping[3], _subData, _returnValues);
        params.borrowAmount = _parseParamUint(params.borrowAmount, _paramMapping[4], _subData, _returnValues);

        (uint256 borrowedAmount, bytes memory logData) = _curveUsdAdjust(params);
        emit ActionEvent("CurveUsdAdjust", logData);
        return bytes32(borrowedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _curveUsdAdjust(params);
        logger.logActionDirectEvent("CurveUsdAdjust", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _curveUsdAdjust(Params memory _params) internal returns (uint256, bytes memory) {

        if (_params.borrowAmount == 0) revert ZeroAmountBorrowed();
        /// @dev see ICrvUsdController natspec
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();
        address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();
        _params.supplyAmount = collateralAsset.pullTokensIfNeeded(_params.from, _params.supplyAmount);

        collateralAsset.approveToken(_params.controllerAddress, _params.supplyAmount);
        ICrvUsdController(_params.controllerAddress).borrow_more(_params.supplyAmount, _params.borrowAmount);

        CRVUSD_TOKEN_ADDR.withdrawTokens(_params.to, _params.borrowAmount);

        return (
            _params.borrowAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}