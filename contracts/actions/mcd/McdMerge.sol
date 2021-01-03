// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IProxyRegistry.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/mcd/IManager.sol";
import "../../utils/GasBurner.sol";
import "../ActionBase.sol";

/// @title Merge two vaults that are of the same type
contract McdMerge is ActionBase, GasBurner {

    address public constant PROXY_REGISTRY_ADDR = 0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint srcVaultId, uint destVaultId, address mcdManager) = parseInputs(_callData);

        srcVaultId = _parseParamUint(srcVaultId, _paramMapping[0], _subData, _returnValues);
        destVaultId = _parseParamUint(destVaultId, _paramMapping[1], _subData, _returnValues);

         _mcdMerge(srcVaultId, destVaultId, mcdManager);

        return bytes32(destVaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override burnGas {
        (uint srcVaultId, uint destVaultId, address mcdManager) = parseInputs(_callData);

        _mcdMerge(srcVaultId, destVaultId, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Merges two vaults, first into second
    /// @dev Will not work if not the exact same ilk
    /// @param _srcVaultId Vault we are mergin
    /// @param _destVaultId Destination vault
    /// @param _mcdManager Mcd manager
    function _mcdMerge(uint _srcVaultId, uint _destVaultId, address _mcdManager) internal {
        IManager(_mcdManager).shift(_srcVaultId, _destVaultId);

        logger.Log(address(this), msg.sender, "McdMerge", abi.encode(_srcVaultId, _destVaultId));
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint srcVaultId,
            uint destVaultId,
            address mcdManager
        )
    {
        srcVaultId = abi.decode(_callData[0], (uint));
        destVaultId = abi.decode(_callData[1], (uint));
        mcdManager = abi.decode(_callData[2], (address));
    }
}
