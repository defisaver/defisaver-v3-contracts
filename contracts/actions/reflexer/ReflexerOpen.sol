// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/ReflexerHelper.sol";

/// @title Open a new Reflexer safe
contract ReflexerOpen is ActionBase, ReflexerHelper {
    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        address adapterAddr = parseInputs(_callData);

        adapterAddr = _parseParamAddr(adapterAddr, _paramMapping[0], _subData, _returnValues);

        uint256 newSafeId = _reflexerOpen(adapterAddr);

        return bytes32(newSafeId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        address adapterAddr = parseInputs(_callData);

        _reflexerOpen(adapterAddr);
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

    function parseInputs(bytes memory _callData) internal pure returns (address adapterAddr) {
        adapterAddr = abi.decode(_callData[0], (address));
    }
}
