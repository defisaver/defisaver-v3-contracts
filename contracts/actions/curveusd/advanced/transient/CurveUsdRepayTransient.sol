// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { ActionBase } from "../../../ActionBase.sol";
import { DFSExchangeData } from "../../../../exchangeV3/DFSExchangeData.sol";

import { CurveUsdHelper } from "../../helpers/CurveUsdHelper.sol";
import { ICrvUsdController } from "../../../../interfaces/curveusd/ICurveUsd.sol";
import { CurveUsdSwapperTransient } from "./CurveUsdSwapperTransient.sol";

/// @title CurveUsdRepayTransient
contract CurveUsdRepayTransient is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param to Address which will receive any leftovers if amount received from selling is greater than debt
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param gasUsed Only used as part of a strategy, estimated gas used for this tx
    struct Params {
        address controllerAddress;
        address to;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 debtTokenReceived, bytes memory logData) = _repay(params);
        emit ActionEvent("CurveUsdRepayTransient", logData);
        return bytes32(debtTokenReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _repay(params);
        logger.logActionDirectEvent("CurveUsdRepayTransient", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _repay(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev Zero input will just return so we explicitly revert here (see ICrvUsdController natspec) 
        if (_params.exData.srcAmount == 0) revert ZeroAmountError();

        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        address curveUsdTransientSwapper = registry.getAddr(CURVE_TRANSIENT_SWAPPER_ID);
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;

        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        address collToken = ICrvUsdController(_params.controllerAddress).collateral_token();
        address debtToken = CRVUSD_TOKEN_ADDR;
        uint256 collStartingBalance = collToken.getBalance(address(this));
        uint256 debtStartingBalance = debtToken.getBalance(address(this));

        ICrvUsdController(_params.controllerAddress).repay_extended(curveUsdTransientSwapper, info);

        // there shouldn't be any funds left on swapper contract after sell but withdrawing it just in case
        CurveUsdSwapperTransient(curveUsdTransientSwapper).withdrawAll(_params.controllerAddress);
        
        // If the amount received from swap is higher than debt there will be leftover debtTokens
        // that will be sent to the user wallet. In that case, if we also haven't sold 100% of collToken,
        // remaining collateral will be sent to the user wallet as well.
        // When this happens, send all leftover collateral and debt tokens to the user
        (, uint256 debtTokenReceived) = _sendLeftoverFundsWithSnapshot(
            collToken,
            debtToken,
            collStartingBalance,
            debtStartingBalance,
            _params.to
        );

        return (
            debtTokenReceived,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}