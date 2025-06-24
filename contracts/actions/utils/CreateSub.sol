// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { Permission } from "../../auth/Permission.sol";
import { SubStorage } from "../../core/strategy/SubStorage.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";

/// @title Action to create a new subscription
contract CreateSub is ActionBase, Permission {

    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    struct Params {
        StrategyModel.StrategySub sub;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        for (uint256 i = 0; i < inputData.sub.subData.length; i++){
            inputData.sub.subData[i] = _parseParamABytes32(inputData.sub.subData[i], _paramMapping[i], _subData, _returnValues);
        }

        uint256 subId = createSub(inputData);

        return (bytes32(subId));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);

        createSub(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
   
    /// @notice Gives user's wallet permission if needed and registers a new sub
    function createSub(Params memory _inputData) internal returns (uint256 subId) {
         /// @dev Give permission to proxy or safe to our auth contract to be able to execute the strategy
        giveWalletPermission(isDSProxy(address(this)));

        subId = SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(_inputData.sub);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
