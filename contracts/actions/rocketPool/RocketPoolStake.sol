// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { DSMath } from "../../DS/DSMath.sol";
import { RocketPoolHelper } from "./helpers/RocketPoolHelper.sol";
import { IRocketDepositPool } from "../../interfaces/rocketPool/IRocketDepositPool.sol";

/// @title Supplies ETH (action receives WETH) to Rocket pool for ETH2 Staking. Receives rETH in return
contract RocketPoolStake is  ActionBase, DSMath, RocketPoolHelper {
    using TokenUtils for address;

    /// @param amount - amount of WETH to pull
    /// @param from - address from which to pull WETH from
    /// @param to - address where received rETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        (uint256 rEthReceivedAmount, bytes memory logData) = _rocketPoolStake(inputData);
        emit ActionEvent("RocketPoolStake", logData);
        return bytes32(rEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _rocketPoolStake(inputData);
        logger.logActionDirectEvent("RocketPoolStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice pulls weth, transforms it into eth, stakes it with rocket pool, receives rEth and sends it to target address
    function _rocketPoolStake(Params memory _inputData) internal returns (uint256 rEthReceivedAmount, bytes memory logData) {
        _inputData.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(
            _inputData.from,
            _inputData.amount
        );
        TokenUtils.withdrawWeth(_inputData.amount);

        uint256 rEthBalanceBefore = RETH.getBalance(address(this));
        
        IRocketDepositPool(ROCKET_DEPOSIT_POOL).deposit{value: _inputData.amount}();
        
        uint256 rEthBalanceAfter = RETH.getBalance(address(this));

        rEthReceivedAmount = rEthBalanceAfter - rEthBalanceBefore;
        logData = abi.encode(_inputData, rEthReceivedAmount);

        RETH.withdrawTokens(_inputData.to, rEthReceivedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
