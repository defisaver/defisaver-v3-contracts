// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../ActionBase.sol";
import "../../../core/strategy/SubStorage.sol";
import "../../../core/strategy/StrategyModel.sol";
import "../../../auth/ProxyPermission.sol";
import "../../../actions/liquity/helpers/CBHelper.sol";

/// @title Special action to subscribe to CB Rebond strategy
contract CBCreateRebondSub is ActionBase, ProxyPermission, CBHelper {
    
    /// @param bondId Id of the chicken bond NFT we want to sub
    struct Params {
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

        params.bondId = _parseParamUint(
            params.bondId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        return(bytes32(createRebondSub(params)));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory params = parseInputs(_callData);

        createRebondSub(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function createRebondSub(Params memory _params) internal returns (uint256 newSubId) {
        givePermission(PROXY_AUTH_ADDR);

        // returns .length which is the next id we are subscribing
        newSubId = SubStorage(SUB_STORAGE_ADDR).getSubsCount();

        StrategyModel.StrategySub memory repaySub = formatRebondSub(newSubId, _params.bondId);

        SubStorage(SUB_STORAGE_ADDR).subscribeToStrategy(repaySub);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
