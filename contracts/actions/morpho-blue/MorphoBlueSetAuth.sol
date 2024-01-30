// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/MorphoBlueHelper.sol";

/// @title Allow or disallow an address to manage MorphoBlue position on user's wallet
contract MorphoBlueSetAuth is ActionBase, MorphoBlueHelper {
    
    struct Params {
        address manager;
        bool newIsAuthorized;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.manager = _parseParamAddr(params.manager, _paramMapping[0], _subData, _returnValues);
        params.newIsAuthorized =  _parseParamUint(params.newIsAuthorized ? 1 : 0, _paramMapping[1], _subData, _returnValues) == 1;

        _setAuth(params);

        emit ActionEvent("MorphoBlueSetAuth", abi.encode(params));
        return bytes32(bytes20(params.manager));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _setAuth(params);
        
        logger.logActionDirectEvent("MorphoBlueSetAuth", abi.encode(params));
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _setAuth(Params memory _params) internal {
        morphoBlue.setAuthorization(_params.manager, _params.newIsAuthorized);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
