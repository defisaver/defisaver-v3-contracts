// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../ActionBase.sol";
import "./../../helpers/ReflexerHelper.sol";

/// @title Get back system coins or collateral tokens that were withdrawn from Uniswap and not used to save a specific SAFE
contract ReflexerNativeUniV2SaviourGetReserves is ActionBase, ReflexerHelper {
    /// @param to - The address that will receive tokens
    /// @param safeId - The ID of the SAFE. This ID should be registered inside GebSafeManager
    struct Params {
        address to;
        uint256 safeId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[0], _subData, _returnValues);

        _reflexerSaviourGetReserves(inputData);
        return bytes32(inputData.safeId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _reflexerSaviourGetReserves(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _reflexerSaviourGetReserves(Params memory _inputData) internal {
        require(_inputData.to != address(0), "Can't send to 0x0");
        ISAFESaviour(NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS).getReserves(
            _inputData.safeId,
            _inputData.to
        );

        logger.Log(
            address(this),
            msg.sender,
            "ReflexerNativeUniV2SaviourGetReserves",
            abi.encode(_inputData)
        );
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
