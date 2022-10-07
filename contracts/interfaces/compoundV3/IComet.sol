// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

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

    function totalsBasic() public virtual view returns (TotalsBasic memory);

    function totalsCollateral(address) public virtual returns (TotalsCollateral memory);
    
    function supply(address asset, uint amount) virtual external;
    function supplyTo(address dst, address asset, uint amount) virtual external;
    function supplyFrom(address from, address dst, address asset, uint amount) virtual external;

    function transfer(address dst, uint amount) virtual external returns (bool);
    function transferFrom(address src, address dst, uint amount) virtual external returns (bool);

    function transferAsset(address dst, address asset, uint amount) virtual external;
    function transferAssetFrom(address src, address dst, address asset, uint amount) virtual external;

    function withdraw(address asset, uint amount) virtual external;
    function withdrawTo(address to, address asset, uint amount) virtual external;
    function withdrawFrom(address src, address to, address asset, uint amount) virtual external;

    function accrueAccount(address account) virtual external;
    function getSupplyRate(uint utilization) virtual public view returns (uint64);
    function getBorrowRate(uint utilization) virtual public view returns (uint64);
    function getUtilization() virtual public view returns (uint);

    function governor() virtual external view returns (address);
    function baseToken() virtual external view returns (address);
    function baseTokenPriceFeed() virtual external view returns (address);

    function balanceOf(address account) virtual public view returns (uint256);
    function collateralBalanceOf(address account, address asset) virtual external view returns (uint128);
    function borrowBalanceOf(address account) virtual public view returns (uint256);
    function totalSupply() virtual external view returns (uint256);

    function numAssets() virtual public view returns (uint8);
    function getAssetInfo(uint8 i) virtual public view returns (AssetInfo memory);
    function getAssetInfoByAddress(address asset) virtual public view returns (AssetInfo memory);
    function getPrice(address priceFeed) virtual public view returns (uint256);

    function allow(address manager, bool isAllowed) virtual external;
    function allowance(address owner, address spender) virtual external view returns (uint256);

    function isSupplyPaused() virtual external view returns (bool);
    function isTransferPaused() virtual external view returns (bool);
    function isWithdrawPaused() virtual external view returns (bool);
    function isAbsorbPaused() virtual external view returns (bool);
    function baseIndexScale() virtual external pure returns (uint64);

    function userBasic(address) virtual external view returns (UserBasic memory);
    function userCollateral(address, address) virtual external view returns (UserCollateral memory);
    function priceScale() virtual external pure returns (uint64);
    function factorScale() virtual external pure returns (uint64);

    function baseBorrowMin() virtual external pure returns (uint256);
    function baseTrackingBorrowSpeed() virtual external pure returns (uint256);
    function baseTrackingSupplySpeed() virtual external pure returns (uint256);

}