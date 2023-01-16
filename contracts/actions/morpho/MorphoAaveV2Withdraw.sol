// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/morpho/IMorpho.sol";
import "../../interfaces/aaveV2/IAaveProtocolDataProviderV2.sol";
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/MorphoHelper.sol";

/// @title Withdraw a token from Morpho
contract MorphoAaveV2Withdraw is ActionBase, MorphoHelper {
    using TokenUtils for address;

    /// @param tokenAddr The address of the token to be withdrawn
    /// @param amount Amount of tokens to be withdrawn
    /// @param to Where the withdrawn tokens will be sent
    struct Params {
        address tokenAddr;
        uint256 amount;
        address to;
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

        (uint256 amount, bytes memory logData) = _withdraw(params);
        emit ActionEvent("MorphoAaveV2Withdraw", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("MorphoAaveV2Withdraw", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        // needed because amount > collateral is safe
        uint256 tokensBefore = _params.tokenAddr.getBalance(_params.to);

        (address aTokenAddress,,) = IAaveProtocolDataProviderV2(
            DEFAULT_MARKET_DATA_PROVIDER
        ).getReserveTokensAddresses(_params.tokenAddr);

        IMorpho(MORPHO_AAVEV2_ADDR).withdraw(aTokenAddress, _params.amount, _params.to);

        _params.amount = _params.tokenAddr.getBalance(_params.to) - tokensBefore;

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}