// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../interfaces/IProxyRegistry.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/mcd/IManager.sol";
import "../ActionBase.sol";

/// @title Merge two vaults that are of the same type
contract McdMerge is ActionBase {
    address public constant PROXY_REGISTRY_ADDR = 0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4;

    struct Params {
        uint256 srcVaultId;
        uint256 destVaultId;
        address mcdManager;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.srcVaultId = _parseParamUint(inputData.srcVaultId, _paramMapping[0], _subData, _returnValues);
        inputData.destVaultId = _parseParamUint(inputData.destVaultId, _paramMapping[1], _subData, _returnValues);

        _mcdMerge(inputData.srcVaultId, inputData.destVaultId, inputData.mcdManager);

        return bytes32(inputData.destVaultId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _mcdMerge(inputData.srcVaultId, inputData.destVaultId, inputData.mcdManager);
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

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
