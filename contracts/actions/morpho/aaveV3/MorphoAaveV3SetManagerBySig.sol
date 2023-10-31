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
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.emodeId = _parseParamUint(params.emodeId, _paramMapping[0], _subData, _returnValues);
        
        _setManager(params);

        emit ActionEvent("MorphoAaveV3SetManagerBySig", abi.encode(params));
        return bytes32(bytes20(params.manager));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _setManager(params);
        
        logger.logActionDirectEvent("MorphoAaveV3SetManagerBySig", abi.encode(params));
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _setManager(Params memory _params) internal {
        address morphoAddress = getMorphoAddressByEmode(_params.emodeId);
        IMorphoAaveV3(morphoAddress).approveManagerWithSig(_params.delegator, _params.manager, _params.isAllowed, _params.nonce, _params.deadline, Types.Signature(_params.v, _params.r, _params.s));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
