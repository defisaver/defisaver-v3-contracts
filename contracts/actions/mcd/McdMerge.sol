// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/IProxyRegistry.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/mcd/IManager.sol";
import "../ActionBase.sol";
import "./helpers/McdHelper.sol";

/// @title Merge two vaults that are of the same type
contract McdMerge is ActionBase, McdHelper {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 srcVaultId, uint256 destVaultId, address mcdManager) = parseInputs(_callData);

        srcVaultId = _parseParamUint(srcVaultId, _paramMapping[0], _subData, _returnValues);
        destVaultId = _parseParamUint(destVaultId, _paramMapping[1], _subData, _returnValues);

        _mcdMerge(srcVaultId, destVaultId, mcdManager);

        return bytes32(destVaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (uint256 srcVaultId, uint256 destVaultId, address mcdManager) = parseInputs(_callData);

        _mcdMerge(srcVaultId, destVaultId, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Merges two vaults, first into second
    /// @dev Will not work if not the exact same ilk
    /// @param _srcVaultId Vault we are merging
    /// @param _destVaultId Destination vault
    /// @param _mcdManager Mcd manager
    function _mcdMerge(
        uint256 _srcVaultId,
        uint256 _destVaultId,
        address _mcdManager
    ) internal {
        IManager(_mcdManager).shift(_srcVaultId, _destVaultId);

        logger.Log(
            address(this),
            msg.sender,
            "McdMerge",
            abi.encode(_srcVaultId, _destVaultId, _mcdManager)
        );
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 srcVaultId,
            uint256 destVaultId,
            address mcdManager
        )
    {
        srcVaultId = abi.decode(_callData[0], (uint256));
        destVaultId = abi.decode(_callData[1], (uint256));
        mcdManager = abi.decode(_callData[2], (address));
    }
}
