// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../ActionBase.sol";
import "../../../core/strategy/SubStorage.sol";
import "../../../core/strategy/StrategyModel.sol";
import "../../../actions/liquity/helpers/CBHelper.sol";

/// @title Special action to update rebond strategy data (Only use in that context)
contract CBUpdateRebondSub is ActionBase, CBHelper {

    error SubDatHashMismatch(uint256, bytes32, bytes32);
    error ImpactTooHigh();

    /// @param subId Id of the sub we are changing (user must be owner)
    /// @param bondId Id of the chicken bond NFT we just created
    /// @param previousBondId Id of the chicken bond NFT that was chickened In
    struct Params {
        uint256 subId;
        uint256 newBondId;
        uint256 previousBondId;
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

        params.newBondId = _parseParamUint(
            params.newBondId,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        updateRebondSub(params);

        return(bytes32(params.subId));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory params = parseInputs(_callData);

        updateRebondSub(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function updateRebondSub(Params memory _params) internal {
        if (_params.previousBondId != 0) {
            StrategyModel.StoredSubData memory storedCBSubData = SubStorage(SUB_STORAGE_ADDR).getSub(_params.subId);
            StrategyModel.StrategySub memory previousRebondSub = formatRebondSub(_params.subId, _params.previousBondId);
            bytes32 cbSubDataHash = keccak256(abi.encode(previousRebondSub));

            // data sent from the caller must match the stored hash of the data
            if (cbSubDataHash != storedCBSubData.strategySubHash) {
                revert SubDatHashMismatch(_params.subId, cbSubDataHash, storedCBSubData.strategySubHash);
            }

            uint256 previousBondLUSDDeposited = CBManager.getBondData(_params.previousBondId).lusdAmount;
            uint256 newBondLUSDDeposited = CBManager.getBondData(_params.newBondId).lusdAmount;

            if (newBondLUSDDeposited <= previousBondLUSDDeposited) {
                revert ImpactTooHigh();
            }
        }
        StrategyModel.StrategySub memory newRebondSub = formatRebondSub(_params.subId, _params.newBondId);

        SubStorage(SUB_STORAGE_ADDR).updateSubData(_params.subId, newRebondSub);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
