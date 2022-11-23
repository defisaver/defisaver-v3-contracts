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

    /// @param subId Id of the sub we are changing (user must be owner)
    /// @param bondId Id of the chicken bond NFT we just created
    struct Params {
        uint256 paybackSourceID;
        SourceType sourceType;
        StrategyModel.StrategySub sub;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.paybackSourceID = _parseParamUint(
            params.paybackSourceID,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        params.sourceType = SourceType(_parseParamUint(
            params.paybackSourceID,
            _paramMapping[1],
            _subData,
            _returnValues
        ));

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

    function getBondId(Params memory _params) internal returns (uint256) {
        if (_params.sourceType == SourceType.BOND){
            return _params.paybackSourceID;
        }

        if (_params.sourceType == SourceType.SUB) {
            StrategyModel.StoredSubData memory storedSubData = SubStorage(SUB_STORAGE_ADDR).getSub(_params.paybackSourceID);
            bytes32 subDataHash = keccak256(abi.encode(_params.sub));
            // data sent from the caller must match the stored hash of the data
            if (subDataHash != storedSubData.strategySubHash) {
                revert SubDatHashMismatch(_params.paybackSourceID, subDataHash, storedSubData.strategySubHash);
            }
            // TODO: maybe this isn't needed because bond will be used and CB Rebond strat won't be executable (will revert)
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(_params.paybackSourceID);

            return uint256(_params.sub.subData[1]);
        }

        revert WrongSourceType(_params.sourceType);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
