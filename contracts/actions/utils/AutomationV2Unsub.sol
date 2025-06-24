// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { SubscriptionsMainnetAddresses } from "./helpers/SubscriptionsMainnetAddresses.sol";
import { ISubscriptions } from "../../interfaces/ISubscriptions.sol";

/// @title Unsubscribe from old automation v2.
/// @notice This action is deprecated.
contract AutomationV2Unsub is ActionBase, SubscriptionsMainnetAddresses {

    enum Protocols {
        MCD,
        COMPOUND,
        AAVE
    }

    /// @param cdpId ID of the cdp to unsubscribe from
    /// @param protocol Protocol to unsubscribe from (MCD, COMPOUND, AAVE)
    struct Params {
        uint256 cdpId;
        Protocols protocol;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.cdpId = _parseParamUint(
            params.cdpId,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.protocol = Protocols(_parseParamUint(
            uint256(params.protocol),
            _paramMapping[1],
            _subData,
            _returnValues
        ));

        bytes memory logData = _automationV2Unsub(params);
        emit ActionEvent("Unsubscribe", logData);
        return bytes32(0);
    }


    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _automationV2Unsub(params);
        logger.logActionDirectEvent("Unsubscribe", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Unsubscribes proxy from automation
    function _automationV2Unsub(Params memory _params) internal returns (bytes memory logData) {
        ( uint256 cdpId, Protocols protocol ) = ( _params.cdpId, _params.protocol );

        if (protocol == Protocols.MCD) {
            ISubscriptions(MCD_SUB_ADDRESS).unsubscribe(cdpId);
        } else if (protocol == Protocols.COMPOUND) {
            ISubscriptions(COMPOUND_SUB_ADDRESS).unsubscribe();
        } else if (protocol == Protocols.AAVE) {
            ISubscriptions(AAVE_SUB_ADDRESS).unsubscribe();
        } else revert("Invalid protocol argument");

        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
