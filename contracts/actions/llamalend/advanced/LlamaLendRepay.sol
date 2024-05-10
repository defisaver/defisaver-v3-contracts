// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";
import { LlamaLendHelper } from "../helpers/LlamaLendHelper.sol";
import { LlamaLendSwapper } from "./LlamaLendSwapper.sol";
import { IBytesTransientStorage } from "../../../interfaces/IBytesTransientStorage.sol";
import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";
import { ILlamaLendController } from "../../../interfaces/llamalend/ILlamaLendController.sol";

/// @title LlamaLendRepay 
contract LlamaLendRepay is ActionBase, LlamaLendHelper{
    using TokenUtils for address;

    /// @param controllerAddress Address of the llamalend market controller
    /// @param controllerId id that matches controller number in factory
    /// @param exData exchange data for swapping (srcAmount will be amount of coll token sold)
    /// @param to address which will receive any leftovers if amount received from selling is greater than debt
    /// @param gasUsed info for automated strategy gas reimbursement
    struct Params {
        address controllerAddress;
        uint256 controllerId;
        DFSExchangeData.ExchangeData exData;
        address to;
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
        emit ActionEvent("LlamaLendRepay", logData);
        return bytes32(debtTokenReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _repay(params);
        logger.logActionDirectEvent("LlamaLendRepay", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _repay(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.exData.srcAmount == 0) revert();
        if (!isControllerValid(_params.controllerAddress, _params.controllerId)) revert InvalidLlamaLendController();

        address llamalendSwapper = registry.getAddr(LLAMALEND_SWAPPER_ID);
       
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;
        info[1] = _params.controllerId;

        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        address collToken = ILlamaLendController(_params.controllerAddress).collateral_token();
        address debtToken = ILlamaLendController(_params.controllerAddress).borrowed_token();
        uint256 collStartingBalance = collToken.getBalance(address(this));
        uint256 debtStartingBalance = debtToken.getBalance(address(this));

        ILlamaLendController(_params.controllerAddress).repay_extended(llamalendSwapper, info);

        // there shouldn't be any funds left on swapper contract but withdrawing it just in case
        LlamaLendSwapper(llamalendSwapper).withdrawAll(_params.controllerAddress);

        // if the amount received from swap is higher than debt there will be leftover debtToken
        // if we haven't sold 100% of coll from the position there will be leftover collToken
        (, uint256 debtTokenReceived) = _sendLeftoverFunds(collToken, debtToken, collStartingBalance, debtStartingBalance, _params.to);

        return (
            debtTokenReceived,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}