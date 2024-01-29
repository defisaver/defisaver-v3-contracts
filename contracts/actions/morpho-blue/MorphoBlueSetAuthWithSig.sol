// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/MorphoBlueHelper.sol";

/// @title Allow or disallow an address to manage MorphoBlue position on user's wallet
contract MorphoBlueSetAuthWithSig is ActionBase, MorphoBlueHelper {
    
    struct Params {
        Authorization authorization;
        Signature signature;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        _setAuth(params);

        emit ActionEvent("MorphoBlueSetAuthWithSig", abi.encode(params));
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _setAuth(params);
        
        logger.logActionDirectEvent("MorphoBlueSetAuthWithSig", abi.encode(params));
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _setAuth(Params memory _params) internal {
        morphoBlue.setAuthorizationWithSig(_params.authorization, _params.signature);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
