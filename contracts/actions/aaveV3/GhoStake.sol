// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IStkAave } from "../../interfaces/aave/IStkAave.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Action to stake GHO tokens.
contract GhoStake is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    /// @param from address to pull the GHO tokens from
    /// @param to address to send the stkGHO tokens to
    /// @param amount amount of GHO tokens to stake
    struct Params {
        address from;
        address to;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);

        (uint256 stkTokensReceived, bytes memory logData) = _stake(params);
        emit ActionEvent("GhoStake", logData);
        return bytes32(stkTokensReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _stake(params);
        logger.logActionDirectEvent("GhoStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _stake(
        Params memory _params
    ) internal returns (uint256 stkTokensReceived, bytes memory logData) {
        require(_params.to != address(0));

        address stakeToken = IStkAave(STAKED_GHO_TOKEN).STAKED_TOKEN();
        _params.amount = stakeToken.pullTokensIfNeeded(_params.from, _params.amount);
        stakeToken.approveToken(STAKED_GHO_TOKEN, _params.amount);

        uint256 stkTokenBalanceBefore = STAKED_GHO_TOKEN.getBalance(_params.to);
        IStkAave(STAKED_GHO_TOKEN).stake(_params.to, _params.amount);
        uint256 stkTokenBalanceAfter = STAKED_GHO_TOKEN.getBalance(_params.to);

        stkTokensReceived = stkTokenBalanceAfter - stkTokenBalanceBefore;
        logData = abi.encode(_params, stkTokensReceived);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
