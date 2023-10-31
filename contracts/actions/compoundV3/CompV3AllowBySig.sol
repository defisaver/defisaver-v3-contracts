// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Allow or disallow manager with signature
contract CompV3AllowBySig is ActionBase, CompV3Helper {

    struct Params {
        address market;
        address owner;
        address manager;
        bool isAllowed;
        uint256 nonce;
        uint256 expiry;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);

        (bytes memory logData) = _allow(params);
        emit ActionEvent("CompV3AllowBySig", logData);
        return bytes32(uint256(params.isAllowed ? 1 : 0));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (bytes memory logData) = _allow(params);
        logger.logActionDirectEvent("CompV3AllowBySig", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _allow(Params memory _params) internal returns (bytes memory) {
        IComet(_params.market).allowBySig(_params.owner,_params.manager, _params.isAllowed, _params.nonce, _params.expiry, _params.v, _params.r, _params.s);

        bytes memory logData = abi.encode(_params.owner, _params.manager, _params.isAllowed, _params.nonce);
        return (logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

}