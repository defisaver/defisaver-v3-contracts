// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/ReflexerHelper.sol";
import "../../utils/TokenUtils.sol";

/// @title Deposit RAI/WETH UniV2 LP tokens for safe protection
contract ReflexerSaviourDeposit is ActionBase, ReflexerHelper {
    using TokenUtils for address;
    address public constant LIQUIDATION_ENGINE_ADDRESS = 0x27Efc6FFE79692E0521E7e27657cF228240A06c2;

    /// @param from - amount of token to supply
    /// @param safeId - address of token to supply
    /// @param lpTokenAmount - amount of token to supply
    /// @param saviour - address of token to supply
    struct Params {
        address from;
        uint256 safeId;
        uint256 lpTokenAmount;
        address saviour;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[0], _subData, _returnValues);
        inputData.lpTokenAmount = _parseParamUint(
            inputData.lpTokenAmount,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        uint256 amountDeposited = _reflexerSaviourDeposit(inputData);
        return bytes32(amountDeposited);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _reflexerSaviourDeposit(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _reflexerSaviourDeposit(Params memory _inputData) internal returns (uint256 amountPulled) {
        safeManager.protectSAFE(_inputData.safeId, LIQUIDATION_ENGINE_ADDRESS, _inputData.saviour);
        
        address lpTokenAddress = ISAFESaviour(_inputData.saviour).lpToken();
        amountPulled = lpTokenAddress.pullTokensIfNeeded(_inputData.from, _inputData.lpTokenAmount);
        lpTokenAddress.approveToken(_inputData.saviour, amountPulled);
        
        ISAFESaviour(_inputData.saviour).deposit(_inputData.safeId, amountPulled);
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}