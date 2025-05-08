// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ILiquidityPool } from "../../interfaces/etherFi/ILiquidityPool.sol";
import { IWeEth } from "../../interfaces/etherFi/IWeEth.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { EtherFiHelper } from "./helpers/EtherFiHelper.sol";

/// @title Supplies ETH (action receives WETH) to EtherFi for ETH2 Staking. Receives eETH in return or weETH in case of wrapping
contract EtherFiStake is ActionBase, EtherFiHelper {
    using TokenUtils for address;

    /// @param amount - amount of WETH to pull
    /// @param from - address from which to pull WETH from
    /// @param to - address where received eETH will be sent to
    /// @param shouldWrap - true if received eETH should be wrapped to weETH
    struct Params {
        uint256 amount;
        address from;
        address to;
        bool shouldWrap;
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
        inputData.shouldWrap = _parseParamUint(
            inputData.shouldWrap ? 1 : 0,
            _paramMapping[3],
            _subData,
            _returnValues
        ) == 1;

        (uint256 receivedAmount, bytes memory logData) = _etherFiStake(inputData);
        emit ActionEvent("EtherFiStake", logData);
        return bytes32(receivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _etherFiStake(inputData);
        logger.logActionDirectEvent("EtherFiStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice This action:
    // 1. Pulls weth
    // 2. Transforms it into eth
    // 3. Stakes it with EtherFi
    // 4. Receives eETH
    // 5. If shouldWrap is true, wraps eETH to weETH
    // 6. Sends tokens to target address
    function _etherFiStake(Params memory _inputData) 
        internal returns (uint256 receivedAmount, bytes memory logData) 
    {
        _inputData.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(
            _inputData.from,
            _inputData.amount
        );
        
        TokenUtils.withdrawWeth(_inputData.amount);

        uint256 eEthBalanceBefore = EETH_ADDR.getBalance(address(this));
        ILiquidityPool(ETHER_FI_LIQUIDITY_POOL).deposit{value: _inputData.amount}();
        uint256 eEthBalanceAfter = EETH_ADDR.getBalance(address(this));

        uint256 eEthReceivedAmount = eEthBalanceAfter - eEthBalanceBefore;

        if (_inputData.shouldWrap) {
            receivedAmount = _etherFiWrapEeth(eEthReceivedAmount);
            WEETH_ADDR.withdrawTokens(_inputData.to, receivedAmount);
        } else {
            receivedAmount = eEthReceivedAmount;
            EETH_ADDR.withdrawTokens(_inputData.to, receivedAmount);
        }

        logData = abi.encode(_inputData, receivedAmount);
    }

    function _etherFiWrapEeth(uint256 _eethAmount) internal returns (uint256 weEthReceivedAmount){
        EETH_ADDR.approveToken(WEETH_ADDR, _eethAmount);

        weEthReceivedAmount = IWeEth(WEETH_ADDR).wrap(_eethAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
