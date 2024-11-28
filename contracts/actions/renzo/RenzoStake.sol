// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IRestakeManager } from "../../interfaces/renzo/IRestakeManager.sol";
import { IRenzoOracle } from "../../interfaces/renzo/IRenzoOracle.sol";
import { IERC20 } from "../../interfaces/IERC20.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { RenzoHelper } from "./helpers/RenzoHelper.sol";

/// @title Supplies ETH (action receives WETH) to Renzo for ETH2 Staking. Receives ezETH in return
contract RenzoStake is ActionBase, RenzoHelper {
    using TokenUtils for address;

    /// @param amount - amount of WETH to pull
    /// @param from - address from which to pull WETH from
    /// @param to - address where received ezETH will be sent to
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

        (uint256 ezEthReceivedAmount, bytes memory logData) = _renzoStake(inputData);
        emit ActionEvent("RenzoStake", logData);
        return bytes32(ezEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _renzoStake(inputData);
        logger.logActionDirectEvent("RenzoStake", logData);
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
    // 3. Stakes it with Renzo
    // 4. Receives ezETH
    // 5. Sends tokens to target address
    function _renzoStake(Params memory _inputData) 
        internal returns (uint256 ezEthReceivedAmount, bytes memory logData) 
    {
        _inputData.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(
            _inputData.from,
            _inputData.amount
        );

        TokenUtils.withdrawWeth(_inputData.amount);

        uint256 ezEthBalanceBefore = EZETH_ADDR.getBalance(address(this));
        IRestakeManager(RENZO_MANAGER).depositETH{value: _inputData.amount}();
        uint256 ezEthBalanceAfter = EZETH_ADDR.getBalance(address(this));

        ezEthReceivedAmount = ezEthBalanceAfter - ezEthBalanceBefore;

        EZETH_ADDR.withdrawTokens(_inputData.to, ezEthReceivedAmount);

        logData = abi.encode(_inputData, ezEthReceivedAmount);
    }

    /// @notice Helper function to get the rate of ezEth per Eth
    function ezEthPerEth() external view returns (uint256 ezEthRate) {
        IRestakeManager manager = IRestakeManager(RENZO_MANAGER);
        IRenzoOracle oracle = IRenzoOracle(manager.renzoOracle());
        (, , uint256 totalTVL) = manager.calculateTVLs();
        uint256 ezEthTotalSupply = IERC20(EZETH_ADDR).totalSupply();

        ezEthRate = oracle.calculateMintAmount(
            totalTVL,
            1 ether,
            ezEthTotalSupply
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}