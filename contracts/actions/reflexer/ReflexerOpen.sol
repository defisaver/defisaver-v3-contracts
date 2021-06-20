// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../ActionBase.sol";
import "./helpers/ReflexerHelper.sol";

/// @title Open a new Reflexer safe
contract ReflexerOpen is ActionBase, ReflexerHelper {

    struct Params {
        address adapterAddr;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.adapterAddr = _parseParamAddr(inputData.adapterAddr, _paramMapping[0], _subData, _returnValues);

        uint256 newSafeId = _reflexerOpen(inputData.adapterAddr);

        return bytes32(newSafeId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _reflexerOpen(inputData.adapterAddr);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up an empty safe
    /// @param _adapterAddr Adapter address of the Reflexer collateral
    function _reflexerOpen(address _adapterAddr) internal returns (uint256 safeId) {
        bytes32 collType = IBasicTokenAdapters(_adapterAddr).collateralType();
        safeId = safeManager.openSAFE(collType, address(this));

        logger.Log(address(this), msg.sender, "ReflexerOpen", abi.encode(safeId, _adapterAddr));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
