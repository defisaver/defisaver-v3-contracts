// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { McdHelper } from "./helpers/McdHelper.sol";
import { ActionBase } from "../ActionBase.sol";
import { IMkrSkyConverter } from "../../interfaces/mcd/IMkrSkyConverter.sol";
import { IDaiUSDSConverter } from "../../interfaces/mcd/IDaiUSDSConverter.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Convert MKR <-> SKY and DAI <-> USDS
contract McdTokenConverter is ActionBase, McdHelper {
    using TokenUtils for address;

    struct Params {
        address tokenAddr;
        address from;
        address to;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.tokenAddr = _parseParamAddr(inputData.tokenAddr, _paramMapping[0], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[3], _subData, _returnValues);

        (uint256 newTokenAmount, bytes memory logData) = _mcdConvert(inputData);
        emit ActionEvent("McdTokenConverter", logData);
        return bytes32(newTokenAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _mcdConvert(inputData);
        logger.logActionDirectEvent("McdTokenConverter", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _mcdConvert(Params memory _inputData) internal returns (uint256, bytes memory) {
        _inputData.amount = _inputData.tokenAddr.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        uint256 newTokenAmount;

        if (_inputData.tokenAddr == USDS_ADDRESS){
            USDS_ADDRESS.approveToken(DAI_USDS_CONVERTER, _inputData.amount);
            IDaiUSDSConverter(DAI_USDS_CONVERTER).usdsToDai(_inputData.to, _inputData.amount);
            newTokenAmount = _inputData.amount;

        } else if (_inputData.tokenAddr == DAI_ADDRESS) {    
            DAI_ADDRESS.approveToken(DAI_USDS_CONVERTER, _inputData.amount);
            IDaiUSDSConverter(DAI_USDS_CONVERTER).daiToUsds(_inputData.to, _inputData.amount);
            newTokenAmount = _inputData.amount;

        } else if (_inputData.tokenAddr == SKY_ADDRESS){
            SKY_ADDRESS.approveToken(MRK_SKY_CONVERTER, _inputData.amount);
            IMkrSkyConverter(MRK_SKY_CONVERTER).skyToMkr(_inputData.to, _inputData.amount);
            newTokenAmount = _inputData.amount / IMkrSkyConverter(MRK_SKY_CONVERTER).rate();

        } else if (_inputData.tokenAddr == MKR_ADDRESS){
            MKR_ADDRESS.approveToken(MRK_SKY_CONVERTER, _inputData.amount);
            IMkrSkyConverter(MRK_SKY_CONVERTER).mkrToSky(_inputData.to, _inputData.amount);
            newTokenAmount = _inputData.amount * IMkrSkyConverter(MRK_SKY_CONVERTER).rate();
        }
        return (newTokenAmount, abi.encode(_inputData, newTokenAmount));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
