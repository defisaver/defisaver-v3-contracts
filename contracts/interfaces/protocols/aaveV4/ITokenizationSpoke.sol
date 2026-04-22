// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface ITokenizationSpoke {
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function hub() external view returns (address);
    function assetId() external view returns (uint256);
    function asset() external view returns (address);
    function decimals() external view returns (uint8);
    function maxDeposit(address) external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256);
}
