// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../interfaces/IProxyRegistry.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/mcd/IManager.sol";
import "../ActionBase.sol";

/// @title Give a vault to a different address
contract McdGive is ActionBase {
    address public constant PROXY_REGISTRY_ADDR = 0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4;

    //Can't send vault to 0x0
    error NoBurnVaultError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 vaultId, address newOwner, bool createProxy, address mcdManager) =
            parseInputs(_callData);

        vaultId = _parseParamUint(vaultId, _paramMapping[0], _subData, _returnValues);
        newOwner = _parseParamAddr(newOwner, _paramMapping[1], _subData, _returnValues);

        newOwner = _mcdGive(vaultId, newOwner, createProxy, mcdManager);

        return bytes32(bytes20(newOwner));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (uint256 vaultId, address newOwner, bool createProxy, address mcdManager) =
            parseInputs(_callData);

        _mcdGive(vaultId, newOwner, createProxy, mcdManager);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gives the vault ownership to a different address
    /// @dev If _createProxy is true, vault is always sent to a proxy
    /// @param _vaultId The id of the vault
    /// @param _newOwner The address of the new owner
    /// @param _createProxy If true, it will create a proxy if the _newOwner does not have one
    /// @param _mcdManager Manager address
    function _mcdGive(
        uint256 _vaultId,
        address _newOwner,
        bool _createProxy,
        address _mcdManager
    ) internal returns (address newOwner) {
        newOwner = _newOwner;

        if (_createProxy) {
            address proxy = IProxyRegistry(PROXY_REGISTRY_ADDR).proxies(_newOwner);

            if (proxy == address(0) || IDSProxy(proxy).owner() != _newOwner) {
                proxy = IProxyRegistry(PROXY_REGISTRY_ADDR).build(_newOwner);
            }

            newOwner = proxy;
        }

        if (newOwner == address(0)){
            revert NoBurnVaultError();
        }

        IManager(_mcdManager).give(_vaultId, newOwner);

        logger.Log(
            address(this),
            msg.sender,
            "McdGive",
            abi.encode(_vaultId, _newOwner, _createProxy, _mcdManager)
        );
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 vaultId,
            address newOwner,
            bool createProxy,
            address mcdManager
        )
    {
        vaultId = abi.decode(_callData[0], (uint256));
        newOwner = abi.decode(_callData[1], (address));
        createProxy = abi.decode(_callData[2], (bool));
        mcdManager = abi.decode(_callData[3], (address));
    }
}
