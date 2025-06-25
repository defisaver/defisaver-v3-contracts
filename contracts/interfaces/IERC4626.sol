// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "./IERC20.sol";

interface IERC4626 is IERC20 {
    function deposit(uint256 _assets, address _receiver) external returns (uint256 shares);
    function mint(uint256 _shares, address _receiver) external returns (uint256 assets);
    function withdraw(uint256 _assets, address _receiver, address _owner) external returns (uint256 shares);
    function redeem(uint256 _shares, address _receiver, address _owner) external returns (uint256 assets);

    function previewDeposit(uint256 _assets) external view returns (uint256 shares);
    function previewMint(uint256 _shares) external view returns (uint256 assets);
    function previewWithdraw(uint256 _assets) external view returns (uint256 shares);
    function previewRedeem(uint256 _shares) external view returns (uint256 assets);

    function convertToAssets(uint256 _shares) external view returns (uint256 assets);
    function convertToShares(uint256 _assets) external view returns (uint256 shares);

    function totalAssets() external view returns (uint256);

    function asset() external view returns (address);

    // These two are specific for sUSDS
    function deposit(uint256 _assets, address _receiver, uint16 _referral) external returns (uint256 shares);
    function mint(uint256 _shares, address _receiver, uint16 _referral) external returns (uint256 assets);
}