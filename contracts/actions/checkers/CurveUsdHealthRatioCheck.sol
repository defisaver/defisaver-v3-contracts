// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ActionBase } from "../ActionBase.sol";
import { TransientStorage } from "../../utils/TransientStorage.sol";
import { ICrvUsdController } from "../../interfaces/curveusd/ICurveUsd.sol";

/// @title Check contract to verify if the current health ratio is over min ratio
contract CurveUsdHealthRatioCheck is ActionBase {

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error BadAfterRatio(uint256 startRatio, uint256 currRatio);
    
    struct Params {
        uint256 minRatio;
        address controllerAddress;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 minRatio = _parseParamUint(uint256(inputData.minRatio), _paramMapping[0], _subData, _returnValues);
        address controllerAddress = _parseParamAddr(inputData.controllerAddress, _paramMapping[1], _subData, _returnValues);

        int256 currentHealth = ICrvUsdController(controllerAddress).health(address(this), true);
        
        uint256 startRatio = uint256(tempStorage.getBytes32("CURVEUSD_HEALTH_RATIO"));
        
        if (uint256(currentHealth) < minRatio) {
            revert BadAfterRatio(startRatio, uint256(currentHealth));
        }

        emit ActionEvent("CurveUsdHealthRatioCheck", abi.encode(currentHealth));
        return bytes32(uint256(currentHealth));
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
