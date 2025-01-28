// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { IGovernance } from "../../../interfaces/liquityV2/IGovernance.sol";

/// @title Unstake LQTY
contract LiquityV2Unstake is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    struct Params {
        uint256 lqtyAmountToUnstake;
        address to; // recieves LQTY and rewards back
        address[] initiativesToReset;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        
        params.lqtyAmountToUnstake = _parseParamUint(params.lqtyAmountToUnstake, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (, bytes memory logData) = _unstake(params);
        emit ActionEvent("LiquityV2Unstake", logData);
        return bytes32(params.lqtyAmountToUnstake);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _unstake(params);
        logger.logActionDirectEvent("LiquityV2Unstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _unstake(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.initiativesToReset.length > 0){
            IGovernance(GOVERNANCE).resetAllocations(_params.initiativesToReset, true);
        }
        IGovernance(GOVERNANCE).withdrawLQTY(_params.lqtyAmountToUnstake, true, _params.to);

        return (0, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
