// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IComet {
    struct AssetInfo {
        uint8 offset;
        address asset;
        address priceFeed;
        uint64 scale;
        uint64 borrowCollateralFactor;
        uint64 liquidateCollateralFactor;
        uint64 liquidationFactor;
        uint128 supplyCap;
    }

    struct TotalsCollateral {
        uint128 totalSupplyAsset;
        uint128 _reserved;
    }

    struct UserCollateral {
        uint128 balance;
        uint128 _reserved;
    }

    struct UserBasic {
        int104 principal;
        uint64 baseTrackingIndex;
        uint64 baseTrackingAccrued;
        uint16 assetsIn;
        uint8 _reserved;
    }

    struct TotalsBasic {
        uint64 baseSupplyIndex;
        uint64 baseBorrowIndex;
        uint64 trackingSupplyIndex;
        uint64 trackingBorrowIndex;
        uint104 totalSupplyBase;
        uint104 totalBorrowBase;
        uint40 lastAccrualTime;
        uint8 pauseFlags;
    }

    function totalsBasic() public view virtual returns (TotalsBasic memory);

    function totalsCollateral(address) public virtual returns (TotalsCollateral memory);

    function supply(address asset, uint256 amount) external virtual;
    function supplyTo(address dst, address asset, uint256 amount) external virtual;
    function supplyFrom(address from, address dst, address asset, uint256 amount) external virtual;

    function transfer(address dst, uint256 amount) external virtual returns (bool);
    function transferFrom(address src, address dst, uint256 amount) external virtual returns (bool);

    function transferAsset(address dst, address asset, uint256 amount) external virtual;
    function transferAssetFrom(address src, address dst, address asset, uint256 amount) external virtual;

    function withdraw(address asset, uint256 amount) external virtual;
    function withdrawTo(address to, address asset, uint256 amount) external virtual;
    function withdrawFrom(address src, address to, address asset, uint256 amount) external virtual;

    function accrueAccount(address account) external virtual;
    function getSupplyRate(uint256 utilization) public view virtual returns (uint64);
    function getBorrowRate(uint256 utilization) public view virtual returns (uint64);
    function getUtilization() public view virtual returns (uint256);

    function governor() external view virtual returns (address);
    function baseToken() external view virtual returns (address);
    function decimals() external view virtual returns (uint256);
    function baseTokenPriceFeed() external view virtual returns (address);

    function balanceOf(address account) public view virtual returns (uint256);
    function collateralBalanceOf(address account, address asset) external view virtual returns (uint128);
    function borrowBalanceOf(address account) public view virtual returns (uint256);
    function totalSupply() external view virtual returns (uint256);

    function numAssets() public view virtual returns (uint8);
    function getAssetInfo(uint8 i) public view virtual returns (AssetInfo memory);
    function getAssetInfoByAddress(address asset) public view virtual returns (AssetInfo memory);
    function getPrice(address priceFeed) public view virtual returns (uint256);

    function allow(address manager, bool isAllowed) external virtual;
    function allowance(address owner, address spender) external view virtual returns (uint256);

    function isSupplyPaused() external view virtual returns (bool);
    function isTransferPaused() external view virtual returns (bool);
    function isWithdrawPaused() external view virtual returns (bool);
    function isAbsorbPaused() external view virtual returns (bool);
    function baseIndexScale() external pure virtual returns (uint64);

    function userBasic(address) external view virtual returns (UserBasic memory);
    function userCollateral(address, address) external view virtual returns (UserCollateral memory);
    function priceScale() external pure virtual returns (uint64);
    function factorScale() external pure virtual returns (uint64);

    function baseBorrowMin() external pure virtual returns (uint256);
    function baseTrackingBorrowSpeed() external pure virtual returns (uint256);
    function baseTrackingSupplySpeed() external pure virtual returns (uint256);
}
