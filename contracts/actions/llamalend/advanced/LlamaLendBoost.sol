// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "../helpers/LlamaLendHelper.sol";
import "./LlamaLendSwapper.sol";
import "../../../interfaces/IBytesTransientStorage.sol";
import "../../../exchangeV3/DFSExchangeData.sol";

/// @title LlamaLendBoost
contract LlamaLendBoost is ActionBase, LlamaLendHelper{
    using TokenUtils for address;

    /// @param controllerAddress Address of the llamalend market controller
    struct Params {
        address controllerAddress;
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
        if (_params.exData.srcAmount == 0) revert();

        address llamalendSwapper = registry.getAddr(LLAMALEND_SWAPPER_ID);
       
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;

        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        ILlamaLendController(_params.controllerAddress).borrow_more_extended(0, _params.exData.srcAmount, llamalendSwapper, info);

        // cleanup after the callback if any funds are left over
        LlamaLendSwapper(llamalendSwapper).withdrawAll(_params.controllerAddress);

        // send funds to user
        _sendLeftoverFunds(_params.controllerAddress, _params.to);

        return (
            _params.exData.srcAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}