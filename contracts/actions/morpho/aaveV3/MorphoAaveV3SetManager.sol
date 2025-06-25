// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../../ActionBase.sol";
import { MorphoAaveV3Helper } from "./helpers/MorphoAaveV3Helper.sol";
import { IMorphoAaveV3 } from "../../../interfaces/morpho/IMorphoAaveV3.sol";

/// @title Allow or disallow an address to manage your Morpho-AaveV3 position on your wallet
contract MorphoAaveV3SetManager is ActionBase, MorphoAaveV3Helper {
    
    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param manager Address of the manager
    /// @param isAllowed Whether the manager is allowed to manage the position
    struct Params {
        uint256 emodeId;
        address manager;
        bool isAllowed;
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
        params.manager = _parseParamAddr(params.manager, _paramMapping[1], _subData, _returnValues);
        
        _setManager(params);

        emit ActionEvent("MorphoAaveV3SetManager", abi.encode(params));
        return bytes32(bytes20(params.manager));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _setManager(params);
        
        logger.logActionDirectEvent("MorphoAaveV3SetManager", abi.encode(params));
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _setManager(Params memory _params) internal {
        address morphoAddress = getMorphoAddressByEmode(_params.emodeId);
        IMorphoAaveV3(morphoAddress).approveManager(_params.manager, _params.isAllowed);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
