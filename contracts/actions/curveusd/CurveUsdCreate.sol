// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";


/// @title Action that creates a curveusd position on behalf of user's wallet
/// @dev both collateralAmount and debtAmount must be non-zero and can be maxUint
contract CurveUsdCreate is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which to pull collateral asset, will default to user's wallet
    /// @param to Address that will receive the borrowed crvUSD, will default to user's wallet
    /// @param collateralAmount Amount of collateral asset to supply
    /// @param debtAmount Amount of crvUSD to borrow (does not support uint.max)
    /// @param nBands Number of bands in which the collateral will be supplied
    struct Params {
        address controllerAddress;
        address from;
        address to;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 nBands;
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
        params.collateralAmount = _parseParamUint(params.collateralAmount, _paramMapping[3], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[4], _subData, _returnValues);
        params.nBands = _parseParamUint(params.nBands, _paramMapping[5], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _curveUsdCreate(params);
        emit ActionEvent("CurveUsdCreate", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _curveUsdCreate(params);
        logger.logActionDirectEvent("CurveUsdCreate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _curveUsdCreate(Params memory _params) internal returns (uint256, bytes memory) {
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();
        _params.collateralAmount = collateralAsset.pullTokensIfNeeded(_params.from, _params.collateralAmount);
        collateralAsset.approveToken(_params.controllerAddress, _params.collateralAmount);

        ICrvUsdController(_params.controllerAddress).create_loan(_params.collateralAmount, _params.debtAmount, _params.nBands);

        CRVUSD_TOKEN_ADDR.withdrawTokens(_params.to, _params.debtAmount);

        return (
            _params.debtAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}