// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityHelper } from "../helpers/LiquityHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action for unstaking LQTY tokens in Liquity
contract LiquityUnstake is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param lqtyAmount Amount of LQTY tokens to unstake
    /// @param to Address that will receive the tokens
    /// @param wethTo Address that will receive ETH(wrapped) gains
    /// @param lusdTo Address that will receive LUSD token gains
    struct Params {
        uint256 lqtyAmount; 
        address to;         
        address wethTo;     
        address lusdTo;     
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lqtyAmount = _parseParamUint(params.lqtyAmount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.wethTo = _parseParamAddr(params.wethTo, _paramMapping[2], _subData, _returnValues);
        params.lusdTo = _parseParamAddr(params.lusdTo, _paramMapping[3], _subData, _returnValues);

        (uint256 unstakedAmount, bytes memory logData) = _liquityUnstake(params);
        emit ActionEvent("LiquityUnstake", logData);
        return bytes32(unstakedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _liquityUnstake(params);
        logger.logActionDirectEvent("LiquityUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _liquityUnstake(Params memory _params) internal returns (uint256, bytes memory) {
        uint256 ethGain = LQTYStaking.getPendingETHGain(address(this));
        uint256 lusdGain = LQTYStaking.getPendingLUSDGain(address(this));

        uint256 staked = LQTYStaking.stakes(address(this));
        _params.lqtyAmount = staked > _params.lqtyAmount ? _params.lqtyAmount : staked;

        LQTYStaking.unstake(_params.lqtyAmount);
        LQTY_TOKEN_ADDRESS.withdrawTokens(_params.to, _params.lqtyAmount);

        withdrawStaking(ethGain, lusdGain, _params.wethTo, _params.lusdTo);

        bytes memory logData = abi.encode(_params, ethGain, lusdGain);
        return (_params.lqtyAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
