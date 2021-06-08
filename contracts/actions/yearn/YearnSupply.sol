// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/yearn/IYVault.sol";
import "../../interfaces/yearn/IYearnRegistry.sol";
import "../../DS/DSMath.sol";

/// @title Supplies tokens to Yearn vault
/// @dev tokens need to be approved for DSProxy to pull them (token address)
contract YearnSupply is ActionBase, DSMath {
    using TokenUtils for address;

    IYearnRegistry public constant yearnRegistry =
        IYearnRegistry(0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804);

    /// @param token - address of token to supply
    /// @param amount - amount of token to supply
    /// @param from - address from which to pull tokens from
    /// @param to - address where received yTokens will be sent to
    struct Params {
        address token;
        uint256 amount;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        uint256 yAmountReceived = _yearnSupply(inputData);
        return bytes32(yAmountReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _yearnSupply(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _yearnSupply(Params memory _inputData) internal returns (uint256 yTokenAmount) {
        IYVault vault = IYVault(yearnRegistry.latestVault(_inputData.token));

        uint256 amountPulled =
            _inputData.token.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        _inputData.token.approveToken(address(vault), amountPulled);
        _inputData.amount = amountPulled;

        uint256 yBalanceBefore = address(vault).getBalance(address(this));
        vault.deposit(_inputData.amount);
        uint256 yBalanceAfter = address(vault).getBalance(address(this));
        yTokenAmount = sub(yBalanceAfter, yBalanceBefore);

        address(vault).withdrawTokens(_inputData.to, yTokenAmount);

        logger.Log(address(this), msg.sender, "YearnSupply", abi.encode(_inputData, yTokenAmount));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
