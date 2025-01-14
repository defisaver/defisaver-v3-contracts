// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IStkAave } from "../../interfaces/aave/IStkAave.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

contract GhoUnstake is ActionBase, AaveV3Helper {

    using TokenUtils for address;

    /// @param amount amount of stkGHO tokens to burn (max.uint to redeem whole balance, 0 to start cooldown period)
    /// @param to address to receive GHO tokens
    struct Params {
        uint256 amount;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 claimedAmount, bytes memory logData) = _unstake(params);
        emit ActionEvent("GhoUnstake", logData);
        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _unstake(params);
        logger.logActionDirectEvent("GhoUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _unstake(
        Params memory _params
    ) internal returns (uint256 unstakedAmount, bytes memory logData) {
        if (_params.amount == 0) {
            IStkAave(STAKED_GHO_TOKEN).cooldown();
        } else {
            address stakedToken = IStkAave(STAKED_GHO_TOKEN).STAKED_TOKEN();
            uint256 startingGHOBalance = stakedToken.getBalance(_params.to);
            IStkAave(STAKED_GHO_TOKEN).redeem(_params.to, _params.amount);
            uint256 claimedGHOAmount = stakedToken.getBalance(_params.to) - startingGHOBalance;

            logData = abi.encode(_params, claimedGHOAmount);
            return (claimedGHOAmount, logData);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
