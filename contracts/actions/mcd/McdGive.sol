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

    struct Params {
        uint256 vaultId;
        address newOwner;
        bool createProxy;
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

        inputData.vaultId = _parseParamUint(inputData.vaultId, _paramMapping[0], _subData, _returnValues);
        inputData.newOwner = _parseParamAddr(inputData.newOwner, _paramMapping[1], _subData, _returnValues);

        inputData.newOwner = _mcdGive(inputData.vaultId, inputData.newOwner, inputData.createProxy, inputData.mcdManager);

        return bytes32(bytes20(inputData.newOwner));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _mcdGive(inputData.vaultId, inputData.newOwner, inputData.createProxy, inputData.mcdManager);
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

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
