// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "../helpers/CurveUsdHelper.sol";

/// @title CurveUsdLevCreate 
contract CurveUsdLevCreate is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param collAmount Amount of collateral asset to supply
    /// @param debtAmount Amount of crvUSD to borrow (will be sold for collateral)
    /// @param minAmount Minimum amount of crvUSD to receive after sell
    /// @param nBands Number of bands in which the collateral will be supplied for soft liquidation
    /// @param from Address from which to pull collateral asset, will default to proxy
    /// @param additionalData Additional data where curve swap path is encoded
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    /// @param dfsFeeDivider Fee divider, if a non standard fee is set it will check for custom fee
    struct Params {
        address controllerAddress;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 minAmount;
        uint256 nBands;
        address from;
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
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[1], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[2], _subData, _returnValues);
        params.minAmount = _parseParamUint(params.minAmount, _paramMapping[3], _subData, _returnValues);
        params.nBands = _parseParamUint(params.nBands, _paramMapping[4], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[5], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _create(params);
        emit ActionEvent("CurveUsdLevCreate", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _create(params);
        logger.logActionDirectEvent("CurveUsdLevCreate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _create(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.collAmount == 0 || _params.debtAmount == 0) revert();

        // pull coll amount
        address collAddr = ICrvUsdController(_params.controllerAddress).collateral_token();
        _params.collAmount = collAddr.pullTokensIfNeeded(_params.from, _params.collAmount);
        collAddr.approveToken(_params.controllerAddress, _params.collAmount);

        // get swapData formatted and write part of curve path in storage for use in curveUsdSwapper
        address curveUsdSwapper = registry.getAddr(CURVE_SWAPPER_ID);
        uint256[] memory swapData =
             _setupCurvePath(
                curveUsdSwapper,
                _params.additionalData,
                _params.debtAmount,
                _params.minAmount,
                _params.gasUsed,
                _params.dfsFeeDivider
        );
        
        // create loan
        ICrvUsdController(_params.controllerAddress).create_loan_extended(
            _params.collAmount,
            _params.debtAmount,
            _params.nBands,
            curveUsdSwapper,
            swapData
        );

        return (
            _params.debtAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}