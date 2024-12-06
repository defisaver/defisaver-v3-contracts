// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { ActionBase } from "../../../ActionBase.sol";
import { DFSExchangeData } from "../../../../exchangeV3/DFSExchangeData.sol";

import { CurveUsdHelper } from "../../helpers/CurveUsdHelper.sol";
import { ICrvUsdController } from "../../../../interfaces/curveusd/ICurveUsd.sol";

/// @title CurveUsdLevCreateTransient
contract CurveUsdLevCreateTransient is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param from Address from which collAmount of collToken will be pulled
    /// @param collAmount Amount of collateral that the user is providing at first
    /// @param nBands Number of bands in which the collateral will be supplied for soft liquidation
    /// @param exData Exchange data for swapping (srcAmount will be amount of crvUSD to borrow and sell for collateral)
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        address from;
        uint256 collAmount;
        uint256 nBands;
        DFSExchangeData.ExchangeData exData;
        uint32 gasUsed;
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
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[2], _subData, _returnValues);
        params.nBands = _parseParamUint(params.nBands, _paramMapping[3], _subData, _returnValues);

        (uint256 debtGeneratedAndSold, bytes memory logData) = _create(params);
        emit ActionEvent("CurveUsdLevCreateTransient", logData);
        return bytes32(debtGeneratedAndSold);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _create(params);
        logger.logActionDirectEvent("CurveUsdLevCreateTransient", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _create(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev Zero input will just return so we explicitly revert here (see ICrvUsdController natspec)
        if (_params.collAmount == 0 || _params.exData.srcAmount == 0) revert ZeroAmountError();

        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        address collAddr = ICrvUsdController(_params.controllerAddress).collateral_token();
        _params.collAmount = collAddr.pullTokensIfNeeded(_params.from, _params.collAmount);

        address curveUsdTransientSwapper = registry.getAddr(CURVE_TRANSIENT_SWAPPER_ID);
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;

        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        collAddr.approveToken(_params.controllerAddress, _params.collAmount);
        
        ICrvUsdController(_params.controllerAddress).create_loan_extended(
            _params.collAmount,
            _params.exData.srcAmount,
            _params.nBands,
            curveUsdTransientSwapper,
            info
        );

        return (
            _params.exData.srcAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}