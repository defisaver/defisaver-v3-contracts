// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "../helpers/LlamaLendHelper.sol";
import "./LlamaLendSwapper.sol";
import "../../../interfaces/IBytesTransientStorage.sol";
import "../../../exchangeV3/DFSExchangeData.sol";

/// @title LlamaLendRepay 
contract LlamaLendRepay is ActionBase, LlamaLendHelper{
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);


        (uint256 generatedAmount, bytes memory logData) = _repay(params);
        emit ActionEvent("LlamaLendRepay", logData);
        return bytes32(generatedAmount);
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

        address llamalendSwapper = registry.getAddr(LLAMALEND_SWAPPER_ID);
       
        uint256[] memory info = new uint256[](5);
        info[0] = _params.gasUsed;

        transientStorage.setBytesTransiently(abi.encode(_params.exData));

        address collToken = ILlamaLendController(_params.controllerAddress).collateral_token();
        address debtToken = ILlamaLendController(_params.controllerAddress).borrowed_token();
        uint256 collStartingBalance = collToken.getBalance(address(this));
        uint256 debtStartingBalance = debtToken.getBalance(address(this));

        ILlamaLendController(_params.controllerAddress).repay_extended(llamalendSwapper, info);

        // cleanup after the callback if any funds are left over
        LlamaLendSwapper(llamalendSwapper).withdrawAll(_params.controllerAddress);

        // send funds to user
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