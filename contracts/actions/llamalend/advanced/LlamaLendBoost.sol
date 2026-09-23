// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {
    ILlamaLendController
} from "../../../interfaces/protocols/llamalend/ILlamaLendController.sol";
import { ILlamaLendSwapper } from "../../../interfaces/protocols/llamalend/ILlamaLendSwapper.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";
import { LlamaLendHelper } from "../helpers/LlamaLendHelper.sol";
import { DFSExchangeData } from "../../../exchangeV3/DFSExchangeData.sol";
import { DFSIds } from "../../../utils/DFSIds.sol";

/// @title LlamaLendBoost
contract LlamaLendBoost is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the llamalend market controller
    /// @param controllerId id that matches controller number in factory
    /// @param exData exchange data for swapping (srcAmount will be amount of debt generated)
    /// @param gasUsed info for automated strategy gas reimbursement
    struct Params {
        address controllerAddress;
        uint256 controllerId;
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

        params.controllerAddress =
            _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _boost(params);
        emit ActionEvent("LlamaLendBoost", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _boost(params);
        logger.logActionDirectEvent("LlamaLendBoost", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _boost(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.exData.srcAmount == 0) revert LlamaLendZeroAmountError();
        if (!isControllerValid(_params.controllerAddress, _params.controllerId)) {
            revert InvalidLlamaLendController();
        }

        address collToken = ILlamaLendController(_params.controllerAddress).collateral_token();
        address debtToken = ILlamaLendController(_params.controllerAddress).borrowed_token();

        // Validate exchange data (we are selling debt to buy more collateral)
        if (_params.exData.srcAddr != debtToken) revert LlamaLendInvalidExchangeSrcToken();
        if (_params.exData.destAddr != collToken) revert LlamaLendInvalidExchangeDestToken();

        address llamalendSwapper = registry.getAddr(DFSIds.LLAMALEND_SWAPPER);

        uint256[] memory callbackArgs = new uint256[](5);
        callbackArgs[0] = _params.gasUsed;
        callbackArgs[1] = _params.controllerId;

        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        ILlamaLendController(_params.controllerAddress)
            .borrow_more_extended(0, _params.exData.srcAmount, llamalendSwapper, callbackArgs);

        // Sanity check:
        // This should never happen and there shouldn't be any funds left on swapper contract after sell,
        // but withdrawing it just in case. Since this action does not have a user recipient parameter,
        // any recovered funds remain on the wallet itself, which is acceptable because:
        // 1. It is not expected to happen at all
        // 2. If it does happen, the user can withdraw the funds from the smart wallet at any time
        ILlamaLendSwapper(llamalendSwapper).withdrawAll(_params.controllerAddress);

        return (_params.exData.srcAmount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
