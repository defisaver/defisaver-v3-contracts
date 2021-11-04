// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/SubscriptionsMainnetAddresses.sol";
import "../../interfaces/ISubscriptions.sol";

contract Unsubscribe is ActionBase, SubscriptionsMainnetAddresses {

    enum Protocols {
        MCD,
        COMPOUND,
        AAVE
    }

    struct Params {
        uint256 cdpId;
        Protocols protocol;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
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

        _unsubscribe(params);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _unsubscribe(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Unsubscribes proxy from automation
    function _unsubscribe(Params memory _params) internal {
        ( uint256 cdpId, Protocols protocol ) = ( _params.cdpId, _params.protocol );

        if (protocol == Protocols.MCD) {
            ISubscriptions(MCD_SUB_ADDRESS).unsubscribe(cdpId);
        } else if (protocol == Protocols.COMPOUND) {
            ISubscriptions(COMPOUND_SUB_ADDRESS).unsubscribe();
        } else if (protocol == Protocols.AAVE) {
            ISubscriptions(AAVE_SUB_ADDRESS).unsubscribe();
        } else revert("Invalid protocol argument");

        logger.Log(
            address(this),
            msg.sender,
            "Unsubscribe",
            abi.encode(
                _params
            )
        );
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}
