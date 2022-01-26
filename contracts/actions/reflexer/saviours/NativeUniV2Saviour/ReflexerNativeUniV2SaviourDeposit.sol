// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../../../ActionBase.sol";
import "./../../helpers/ReflexerHelper.sol";
import "../../../../utils/TokenUtils.sol";

/// @title Deposit lpToken in the contract in order to provide cover for a specific SAFE managed by the SAFE Manager
contract ReflexerNativeUniV2SaviourDeposit is ActionBase, ReflexerHelper {
    using TokenUtils for address;

    /// @param from - The address from which to pull LP tokens
    /// @param safeId - The ID of the SAFE to protect. This ID should be registered inside GebSafeManager
    /// @param lpTokenAmount - The amount of LP tokens to deposit
    struct Params {
        address from;
        uint256 safeId;
        uint256 lpTokenAmount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[0], _subData, _returnValues);
        inputData.safeId = _parseParamUint(inputData.safeId, _paramMapping[1], _subData, _returnValues);
        inputData.lpTokenAmount = _parseParamUint(
            inputData.lpTokenAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );

        (uint256 amountDeposited, bytes memory logData) = _reflexerSaviourDeposit(inputData);
        emit ActionEvent("ReflexerNativeUniV2SaviourDeposit", logData);
        return bytes32(amountDeposited);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _reflexerSaviourDeposit(inputData);
        logger.logActionDirectEvent("ReflexerNativeUniV2SaviourDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _reflexerSaviourDeposit(Params memory _inputData)
        internal
        returns (uint256 amountPulled, bytes memory logData)
    {   
        safeManager.protectSAFE(
            _inputData.safeId,
            LIQUIDATION_ENGINE_ADDRESS,
            NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS
        );

        amountPulled = UNIV2_RAI_WETH_ADDRESS.pullTokensIfNeeded(
            _inputData.from,
            _inputData.lpTokenAmount
        );
        UNIV2_RAI_WETH_ADDRESS.approveToken(
            NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS,
            amountPulled
        );
        ISAFESaviour(NATIVE_UNDERLYING_UNI_V_TWO_SAVIOUR_ADDRESS).deposit(
            _inputData.safeId,
            amountPulled
        );

        logData = abi.encode(_inputData, amountPulled);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
