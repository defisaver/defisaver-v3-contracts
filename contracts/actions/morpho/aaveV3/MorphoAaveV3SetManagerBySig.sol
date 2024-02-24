// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../ActionBase.sol";
import "./helpers/MorphoAaveV3Helper.sol";

/// @title Allow or disallow an address to manage your Morpho-AaveV3 DSProxy position
contract MorphoAaveV3SetManagerBySig is ActionBase, MorphoAaveV3Helper {
    
    struct Params {
        uint256 emodeId;
        address delegator;
        address manager;
        bool isAllowed;
        uint256 nonce;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        ///@dev nothing will be piped and potentially replaced as we need to have the exact values as signed
        bytes memory logData = _setManager(params);

        emit ActionEvent("MorphoAaveV3SetManagerBySig", abi.encode(logData));
        return bytes32(bytes20(params.manager));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        bytes memory logData = _setManager(params);
        
        logger.logActionDirectEvent("MorphoAaveV3SetManagerBySig", abi.encode(logData));
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _setManager(Params memory _params) internal returns (bytes memory){
        address morphoAddress = getMorphoAddressByEmode(_params.emodeId);

        IMorphoAaveV3(morphoAddress).approveManagerWithSig(_params.delegator, _params.manager, _params.isAllowed, _params.nonce, _params.deadline, Types.Signature(_params.v, _params.r, _params.s));
        
        ///@dev Every successful call to permit increases owners nonce by one. 
        require(IMorphoAaveV3(morphoAddress).userNonce(_params.delegator) == _params.nonce + 1);

        bytes memory logData = abi.encode(_params.delegator, _params.manager, _params.isAllowed, _params.nonce);
        return (logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
