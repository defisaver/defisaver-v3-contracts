// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IMorpho } from "../../../interfaces/morpho/IMorpho.sol";
import { IAaveProtocolDataProviderV2 } from "../../../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { MorphoAaveV2Helper } from "./helpers/MorphoAaveV2Helper.sol";

/// @title Borrow a token from Morpho
contract MorphoAaveV2Borrow is ActionBase, MorphoAaveV2Helper {
    using TokenUtils for address;

    /// @param tokenAddr The address of the token to be borrowed
    /// @param amount Amount of tokens to be borrowed
    /// @param to The address we are sending the borrowed tokens to
    /// @param maxGasForMatching - Max gas to spend on p2p matching
    struct Params {
        address tokenAddr;
        uint256 amount;
        address to;
        uint256 maxGasForMatching;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _borrow(params);
        emit ActionEvent("MorphoAaveV2Borrow", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params);
        logger.logActionDirectEvent("MorphoAaveV2Borrow", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _borrow(Params memory _params) internal returns (uint256, bytes memory) {
        (address aTokenAddress,,) =
            IAaveProtocolDataProviderV2(DEFAULT_MARKET_DATA_PROVIDER).getReserveTokensAddresses(_params.tokenAddr);

        if (_params.maxGasForMatching == 0) {
            IMorpho(MORPHO_AAVEV2_ADDR).borrow(aTokenAddress, _params.amount);
        } else {
            IMorpho(MORPHO_AAVEV2_ADDR).borrow(aTokenAddress, _params.amount, _params.maxGasForMatching);
        }
        _params.amount = _params.tokenAddr.withdrawTokens(_params.to, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
