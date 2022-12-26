// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../ActionBase.sol";
import "../../../core/strategy/SubStorage.sol";
import "../../../core/strategy/StrategyModel.sol";
import "../../../actions/liquity/helpers/CBHelper.sol";

/// @title Special action to fetch BondId for the Liquity payback from CB strategy and to deactivate rebond strategy if bond from rebond strat was used
contract FetchBondId is ActionBase, CBHelper {

    error WrongSourceType(SourceType);
    error SubDatHashMismatch(uint256, bytes32, bytes32);

    enum SourceType{
        BOND,
        SUB
    }

    /// @param paybackSourceId Id of the payback source, can be either bondId or rebond strat subId
    /// @param sourceType if paybackSourceId refers to a bondId or subId
    /// @param cbRebondBondId Id of the current bond in the Rebond sub (only used if sourceType is SUB, otherwise 0)
    struct Params {
        uint256 paybackSourceId;
        uint256 sourceType;
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

        params.paybackSourceId = _parseParamUint(
            params.paybackSourceId,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.sourceType = _parseParamUint(
            params.sourceType,
            _paramMapping[1],
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

    /// @dev depending on sourceType passed from users subData fetch BondId and return it
    /// @notice _params.cbRebondBondId is sent externally so we can hash the sub object and compare it with what's stored in onchain storage
    /// @notice if sourceType is SUB, we deactivate the rebond strategy
    function getBondId(Params memory _params) internal returns (uint256) {
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

            SubStorage(SUB_STORAGE_ADDR).deactivateSub(_params.paybackSourceId);

            return _params.cbRebondBondId;
        }

        revert WrongSourceType(SourceType(_params.sourceType));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
