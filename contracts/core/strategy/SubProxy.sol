// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../auth/ProxyPermission.sol";
import "../../DS/DSGuard.sol";
import "../../DS/DSAuth.sol";
import "./SubStorage.sol";
import "../DFSRegistry.sol";

/// @title Handles auth and calls subscription contract
contract SubProxy is StrategyModel, AdminAuth, ProxyPermission {

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    // TODO: Switch to constant hardcoded addresses for gas saving
    bytes4 constant PROXY_AUTH_ID = bytes4(keccak256("ProxyAuth"));
    bytes4 constant SUB_STORAGE_ID = bytes4(keccak256("SubStorage"));

    function subscribeToStrategy(
        StrategySub calldata _sub
    ) public {
        /// gas-block-0
        address proxyAuthAddr = registry.getAddr(PROXY_AUTH_ID);
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);
        /// gas-block-0 - 11k gas cost

        givePermission(proxyAuthAddr); // gas-block-1 - 12,233 gas cost if have permission, 54,938 first time

        SubStorage(subStorageAddr).subscribeToStrategy(_sub);
    }

    function updateSubData(
        uint256 _subId,
        StrategySub calldata _sub
    ) public {
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

        SubStorage(subStorageAddr).updateSubData(_subId, _sub);
    }

    // function activateSub(
    //     uint _subId
    // ) public {
    //     address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

    //     SubStorage(subStorageAddr).activateSub(_subId);
    // }

    // function deactivateSub(
    //     uint _subId
    // ) public {
    //     address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

    //     SubStorage(subStorageAddr).deactivateSub(_subId);
    // }

    function removeSub(uint256 _subId) public {
        address subStorageAddr = registry.getAddr(SUB_STORAGE_ID);

        SubStorage(subStorageAddr).removeSub(_subId);

        // TODO: can we figure out if this is the last subscription for user and remove auth?
        // removePermission(proxyAuthAddr);
    }
}
