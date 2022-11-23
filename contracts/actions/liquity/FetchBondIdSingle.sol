// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../core/strategy/SubStorage.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../actions/liquity/helpers/CBHelper.sol";

/// @title Special action to fetch Bond Id for the Liquity payback from CB strategy and to deactivate strategy
contract FetchBondIdSingle is ActionBase, CBHelper {

    error WrongSourceType(SourceType);
    error SubDatHashMismatch(uint256, bytes32, bytes32);

    enum SourceType{
        BOND,
        SUB
    }

    /// @param paybackSourceId
    /// @param sourceType 
    /// @param cbRebondBondId Id of the current bond in the Rebond sub (only used if paybackSourceId is of a sub, otherwise 0)
    struct Params {
        uint256 paybackSourceId; // this would be piped from sub data
        uint256 sourceType; // this would be piped from sub data
        uint256 cbRebondBondId; // backend would enter this
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.paybackSourceId = _parseParamUint(
            params.paybackSourceId,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.sourceType = _parseParamUint(
            params.sourceType,
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
        if (SourceType(_params.sourceType) == SourceType.BOND){
            return _params.paybackSourceId;
        }

        if (SourceType(_params.sourceType) == SourceType.SUB) {
            StrategyModel.StoredSubData memory storedCBSubData = SubStorage(SUB_STORAGE_ADDR).getSub(_params.paybackSourceId);
            StrategyModel.StrategySub memory rebondSub = formatRebondSub(_params.paybackSourceId, _params.cbRebondBondId);
            bytes32 cbSubDataHash = keccak256(abi.encode(rebondSub));
            // data sent from the caller must match the stored hash of the data
            if (cbSubDataHash != storedCBSubData.strategySubHash) {
                revert SubDatHashMismatch(_params.paybackSourceId, cbSubDataHash, storedCBSubData.strategySubHash);
            }
            // TODO: maybe this isn't needed because bond will be used and CB Rebond strat won't be executable (will revert)
            //SubStorage(SUB_STORAGE_ADDR).deactivateSub(paybackSourceId);

            return _params.cbRebondBondId;
        }

        revert WrongSourceType(SourceType(_params.sourceType));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
