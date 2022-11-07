// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../ActionBase.sol";
import "../../../core/strategy/SubStorage.sol";
import "../../../core/strategy/StrategyModel.sol";
import "../../../actions/liquity/helpers/CBHelper.sol";

/// @title Special action to update rebond strategy data (Only use in that context)
contract CBUpdateRebondSub is ActionBase, CBHelper {

    /// @param subId Id of the sub we are changing (user must be owner)
    /// @param bondId Id of the chicken bond NFT we just created
    struct Params {
        uint256 subId;
        uint256 bondId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.subId = _parseParamUint(
            params.subId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        params.bondId = _parseParamUint(
            params.bondId,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        updateRebondSub(params);

        return(bytes32(params.subId));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);

        updateRebondSub(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function updateRebondSub(Params memory _params) internal {
        StrategyModel.StrategySub memory rebondSub = formatRebondSub(REBOND_STRATEGY_ID, _params.subId, _params.bondId);

        SubStorage(SUB_STORAGE_ADDR).updateSubData(_params.subId, rebondSub);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
