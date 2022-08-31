// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Allow or disallow manager
contract CompV3Allow is ActionBase, CompV3Helper {

    struct Params {
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

        params.manager = _parseParamAddr(params.manager, _paramMapping[0], _subData, _returnValues);
        params.isAllowed = _parseParamUint(params.isAllowed ? 1 : 0, _paramMapping[1], _subData, _returnValues) == 1;

        (bool isAllowed, bytes memory logData) = _allow(params.manager, params.isAllowed);
        emit ActionEvent("CompV3Allow", logData);
        return bytes32(uint256(isAllowed ? 1 : 0));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _allow(params.manager, params.isAllowed);
        logger.logActionDirectEvent("CompV3Allow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User allowes or disallowes manager
    /// @param _manager Address of manager
    /// @param _isAllowed True for allow, false for disallow
    function _allow(
        address _manager,
        bool _isAllowed
    ) internal returns (bool, bytes memory) {
        IComet(COMET_ADDR).allow(_manager,_isAllowed);

        bytes memory logData = abi.encode(_manager, _isAllowed);
        return (_isAllowed, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

}