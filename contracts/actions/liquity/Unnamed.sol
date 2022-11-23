// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../core/strategy/SubStorage.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../actions/liquity/helpers/CBHelper.sol";

/// @title Special action to fetch Bond Id for the Liquity payback from CB strategy and to deactivate strategy
contract Unnamed is ActionBase, CBHelper {

    error WrongSourceType(SourceType);
    error SubDatHashMismatch(uint256, bytes32, bytes32);

    enum SourceType{
        EMPTY,
        BOND,
        SUB
    }

    /// @param currentSubId Id of the current strategy sub being executed
    /// @param ordinalNumberOfSourceId Ordinal number of the paybackSource being used starting from 0
    /// @param paybackSub StrategySub object of this subscription
    /// @param cbRebondBondId Id of the current bond in the Rebond sub (only used if paybackSourceId is of a sub, otherwise 0)
    struct Params {
        uint256 currentSubId;
        uint256 ordinalNumberOfSourceId;
        StrategyModel.StrategySub paybackSub;
        uint256 cbRebondBondId;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.currentSubId = _parseParamUint(
            params.currentSubId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        uint256 bondId = getBondId(params);

        return(bytes32(bondId));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function getBondId(Params memory _params) internal view returns (uint256) {

        StrategyModel.StoredSubData memory storedPaybackSubData = SubStorage(SUB_STORAGE_ADDR).getSub(_params.currentSubId);
        bytes32 paybackSubDataHash = keccak256(abi.encode(_params.paybackSub));
        // data sent from the caller must match the stored hash of the data
        if (paybackSubDataHash != storedPaybackSubData.strategySubHash) {
            revert SubDatHashMismatch(_params.currentSubId, paybackSubDataHash, storedPaybackSubData.strategySubHash);
        }
        
        uint256 paybackSourceId = uint256(_params.paybackSub.subData[2 + _params.ordinalNumberOfSourceId]);
        uint256 sourceType = uint256(_params.paybackSub.subData[2 + uint256(_params.paybackSub.subData[1]) + _params.ordinalNumberOfSourceId]);

        if (SourceType(sourceType) == SourceType.BOND){
            return paybackSourceId;
        }

        if (SourceType(sourceType) == SourceType.SUB) {
            StrategyModel.StoredSubData memory storedCBSubData = SubStorage(SUB_STORAGE_ADDR).getSub(paybackSourceId);
            StrategyModel.StrategySub memory rebondSub = formatRebondSub(paybackSourceId, _params.cbRebondBondId);
            bytes32 cbSubDataHash = keccak256(abi.encode(rebondSub));
            // data sent from the caller must match the stored hash of the data
            if (cbSubDataHash != storedCBSubData.strategySubHash) {
                revert SubDatHashMismatch(paybackSourceId, cbSubDataHash, storedCBSubData.strategySubHash);
            }
            // TODO: maybe this isn't needed because bond will be used and CB Rebond strat won't be executable (will revert)
            //SubStorage(SUB_STORAGE_ADDR).deactivateSub(paybackSourceId);

            return _params.cbRebondBondId;
        }

        revert WrongSourceType(SourceType(sourceType));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
