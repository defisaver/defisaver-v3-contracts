// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityHelper } from "../helpers/LiquityHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action for withdrawing LUSD tokens from the stability pool
contract LiquitySPWithdraw is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param lusdAmount Amount of LUSD tokens to withdraw
    /// @param to Address that will receive the tokens
    /// @param wethTo Address that will receive ETH(wrapped) gains
    /// @param lqtyTo Address that will receive LQTY token gains
    struct Params {
        uint256 lusdAmount; 
        address to;         
        address wethTo;     
        address lqtyTo;     
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lusdAmount = _parseParamUint(params.lusdAmount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.wethTo = _parseParamAddr(params.wethTo, _paramMapping[2], _subData, _returnValues);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[3], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _liquitySPWithdraw(params);
        emit ActionEvent("LiquitySPWithdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _liquitySPWithdraw(params);
        logger.logActionDirectEvent("LiquitySPWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _liquitySPWithdraw(Params memory _params) internal returns (uint256, bytes memory) {
        uint256 ethGain = StabilityPool.getDepositorETHGain(address(this));
        uint256 lqtyBefore = LQTY_TOKEN_ADDRESS.getBalance(address(this));

        uint256 deposit = StabilityPool.getCompoundedLUSDDeposit(address(this));
        _params.lusdAmount = deposit > _params.lusdAmount ? _params.lusdAmount : deposit;

        StabilityPool.withdrawFromSP(_params.lusdAmount);
        // Amount goes through min(amount, depositedAmount)
        LUSD_TOKEN_ADDRESS.withdrawTokens(_params.to, _params.lusdAmount);

        uint256 lqtyGain = LQTY_TOKEN_ADDRESS.getBalance(address(this)) - (lqtyBefore);

        withdrawStabilityGains(ethGain, lqtyGain, _params.wethTo, _params.lqtyTo);

        bytes memory logData = abi.encode(_params, ethGain, lqtyGain);
        return (_params.lusdAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
