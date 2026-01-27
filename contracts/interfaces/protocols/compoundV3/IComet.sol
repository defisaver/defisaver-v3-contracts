// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IComet {
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

    function totalsBasic() external view returns (TotalsBasic memory);

    function totalsCollateral(address) external returns (TotalsCollateral memory);

    function supply(address asset, uint256 amount) external;
    function supplyTo(address dst, address asset, uint256 amount) external;
    function supplyFrom(address from, address dst, address asset, uint256 amount) external;

    function transfer(address dst, uint256 amount) external returns (bool);
    function transferFrom(address src, address dst, uint256 amount) external returns (bool);

    function transferAsset(address dst, address asset, uint256 amount) external;
    function transferAssetFrom(address src, address dst, address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;
    function withdrawTo(address to, address asset, uint256 amount) external;
    function withdrawFrom(address src, address to, address asset, uint256 amount) external;

    function accrueAccount(address account) external;
    function getSupplyRate(uint256 utilization) external view returns (uint64);
    function getBorrowRate(uint256 utilization) external view returns (uint64);
    function getUtilization() external view returns (uint256);

    function governor() external view returns (address);
    function baseToken() external view returns (address);
    function baseTokenPriceFeed() external view returns (address);

    function balanceOf(address account) external view returns (uint256);
    function collateralBalanceOf(address account, address asset) external view returns (uint128);
    function borrowBalanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);

    function numAssets() external view returns (uint8);
    function getAssetInfo(uint8 i) external view returns (AssetInfo memory);
    function getAssetInfoByAddress(address asset) external view returns (AssetInfo memory);
    function getPrice(address priceFeed) external view returns (uint256);

    function allow(address manager, bool isAllowed) external;
    function allowance(address owner, address spender) external view returns (uint256);

    function isSupplyPaused() external view returns (bool);
    function isTransferPaused() external view returns (bool);
    function isWithdrawPaused() external view returns (bool);
    function isAbsorbPaused() external view returns (bool);
    function baseIndexScale() external pure returns (uint64);

    function userBasic(address) external view returns (UserBasic memory);
    function userCollateral(address, address) external view returns (UserCollateral memory);
    function priceScale() external pure returns (uint64);
    function baseScale() external pure returns (uint256);
    function factorScale() external pure returns (uint64);

    function baseBorrowMin() external pure returns (uint256);
    function baseTrackingBorrowSpeed() external pure returns (uint256);
    function baseTrackingSupplySpeed() external pure returns (uint256);
}
