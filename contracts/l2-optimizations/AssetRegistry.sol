// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";

contract AssetRegistry is AdminAuth {
    error AssetAlreadyRegistered();
    error ArrayLengthMismatch();

    mapping(address => bytes2) public assetId;
    mapping(bytes2 => address) public assetAddr;

    function addAsset(address _assetAddr, bytes2 _assetId) public onlyOwner {
        if (assetAddr[_assetId] != address(0)) revert AssetAlreadyRegistered();

        assetId[_assetAddr] = _assetId;
        assetAddr[_assetId] = _assetAddr;
    }

    function bulkAddAsset(address[] memory _assetAddrs, bytes2[] memory _assetIds) public onlyOwner {
        if (_assetAddrs.length != _assetIds.length) revert ArrayLengthMismatch();
        for (uint256 i = 0; i < _assetAddrs.length; i++) addAsset(_assetAddrs[i], _assetIds[i]);
    }
}