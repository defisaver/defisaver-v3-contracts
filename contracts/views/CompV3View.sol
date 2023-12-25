// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../DS/DSMath.sol";
import "../utils/Exponential.sol";
import "../utils/TokenPriceHelper.sol";
import "../interfaces/compoundV3/IComet.sol";
import "../interfaces/compoundV3/ICometExt.sol";
import "../interfaces/compoundV3/ICometRewards.sol";

import "../actions/compoundV3/helpers/CompV3Helper.sol";
import "hardhat/console.sol";

contract CompV3View is Exponential, DSMath, CompV3Helper, TokenPriceHelper {

    struct LoanData {
        address user;
        address[] collAddr;
        uint[] collAmounts;
        uint depositAmount;
        uint depositValue;
        uint borrowAmount;
        uint borrowValue;
        uint collValue;
    }

    struct CollateralInfoFull {
        address tokenAddr;
        uint totalSupply;
        uint supplyReserved;
        uint borrowCollateralFactor;
        uint liquidateCollateralFactor;
        uint liquidationFactor;
        uint price;
        uint supplyCap;
    }

    struct BaseTokenInfoFull {
        address tokenAddr;
        uint price;
        uint supplyIndex;
        uint borrowIndex;
        uint trackingSupplyIndex;
        uint trackingBorrowIndex;
        uint supplyRate;
        uint borrowRate;
        uint totalSupply;
        uint totalBorrow;
        uint utilization;
        uint baseBorrowMin;
        uint baseTrackingBorrowRewardsSpeed;
        uint baseTrackingSupplyRewardsSpeed;
    }

    struct GovernanceInfoFull {
        bool isSupplyPaused;
        bool isTransferPaused;
        bool isWithdrawPaused;
        bool isAbsorbPaused;
    }
    
    function isAllowed(address _market, address _owner, address _manager) public view returns(bool isAllowed) {
        return ICometExt(_market).allowance(_owner, _manager) == 0 ? false : true;
    }

    /// @notice Returns all supported collateral assets 
    function getAssets(address _market) public view returns(IComet.AssetInfo[] memory assets){
        uint8 numAssets = IComet(_market).numAssets();
        assets = new IComet.AssetInfo[](numAssets);

        for(uint8 i = 0; i < numAssets; i++){
            assets[i] = IComet(_market).getAssetInfo(i);
        }
        return assets;
    }


    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _users Addresses of the user
    /// @return loans Array of LoanData information
    function getLoanDataArr(address _market, address[] memory _users) public view returns (LoanData[] memory loans) {
        loans = new LoanData[](_users.length);

        for (uint i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_market, _users[i]);
        }
    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _market, address _user) public view returns (LoanData memory data) {
        IComet.AssetInfo[] memory assets = getAssets(_market);
        IComet comet = IComet(_market);

        data = LoanData({
            user: _user,
            collAddr: new address[](assets.length),
            collAmounts: new uint[](assets.length),
            depositAmount: 0,
            depositValue: 0,
            borrowAmount: 0,
            borrowValue: 0,
            collValue: 0
        });

        bool isEthMarket = keccak256(abi.encode(comet.symbol())) == keccak256(abi.encode(WETH_TOKEN_SYMBOL));

        for (uint i = 0; i < assets.length; i++) {
            address assetAddr = assets[i].asset;

            data.collAddr[i] = assetAddr;

            uint collBalance = comet.collateralBalanceOf(_user, assetAddr);
            data.collAmounts[i] = collBalance;
        
            if (collBalance != 0) {

                if (isEthMarket) {
                    uint256 collValueInEth = comet.getPrice(assets[i].priceFeed);
                    uint256 ethInUsd = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
                    uint256 collValueInUsd = collValueInEth * ethInUsd / 1e8;
                    uint256 value = collBalance * collValueInUsd / assets[i].scale;
                    data.collValue += value;
                } 
                else {
                    uint value = collBalance * comet.getPrice(assets[i].priceFeed) / assets[i].scale;
                    data.collValue += value;
                }
            }
        }

        data.borrowAmount = comet.borrowBalanceOf(_user);
        data.depositAmount = comet.balanceOf(_user);

        if (isEthMarket) {
            uint256 ethInUsd = uint256(getChainlinkPriceInUSD(ETH_ADDR, false));
            data.borrowValue = data.borrowAmount * ethInUsd / comet.baseScale();
            data.depositValue = data.depositAmount * ethInUsd / comet.baseScale();
        } else {
            address usdcPriceFeed = comet.baseTokenPriceFeed();
            uint256 usdcInUsd = comet.getPrice(usdcPriceFeed);
            data.borrowValue = data.borrowAmount * usdcInUsd / comet.baseScale();
            data.depositValue = data.depositAmount * usdcInUsd / comet.baseScale();
        }

        return data;
    }

    function getFullCollInfo(address _market, address _tokenAddr) public returns(CollateralInfoFull memory coll) {
        IComet comet = IComet(_market);

        IComet.AssetInfo memory assetInfo = comet.getAssetInfoByAddress(_tokenAddr);
        IComet.TotalsCollateral memory totalColl = comet.totalsCollateral(_tokenAddr);

        coll = CollateralInfoFull({
            tokenAddr: _tokenAddr,
            totalSupply: totalColl.totalSupplyAsset,
            supplyReserved: totalColl._reserved,
            borrowCollateralFactor: assetInfo.borrowCollateralFactor,
            liquidateCollateralFactor: assetInfo.liquidateCollateralFactor,
            liquidationFactor: assetInfo.liquidationFactor,
            price: comet.getPrice(assetInfo.priceFeed),
            supplyCap: assetInfo.supplyCap
        });
    }

    function getFullBaseTokenInfo(address _market) public view returns (BaseTokenInfoFull memory baseToken) {
        IComet comet = IComet(_market);

        IComet.TotalsBasic memory basics = comet.totalsBasic();

        uint utilization = comet.getUtilization();

        baseToken = BaseTokenInfoFull({
            tokenAddr: comet.baseToken(),
            price: comet.getPrice(comet.baseTokenPriceFeed()),
            supplyIndex: basics.baseSupplyIndex,
            borrowIndex: basics.baseBorrowIndex,
            trackingSupplyIndex: basics.trackingSupplyIndex,
            trackingBorrowIndex: basics.trackingBorrowIndex,
            supplyRate: comet.getSupplyRate(utilization),
            borrowRate: comet.getBorrowRate(utilization),
            totalSupply: basics.totalSupplyBase,
            totalBorrow: basics.totalBorrowBase,
            utilization: utilization,
            baseBorrowMin: comet.baseBorrowMin(),
            baseTrackingBorrowRewardsSpeed: comet.baseTrackingBorrowSpeed(),
            baseTrackingSupplyRewardsSpeed: comet.baseTrackingSupplySpeed()
        });
    }

    function getFullCollInfos(address _market) public returns(CollateralInfoFull[] memory colls) {
        IComet.AssetInfo[] memory assets = getAssets(_market);
        colls = new CollateralInfoFull[](assets.length);

        for (uint i; i < assets.length; ++i) {
            colls[i] = getFullCollInfo(_market, assets[i].asset);
        }
    }

    function getAssetPrice(address _market, address _tokenAddr) public view returns (uint256) {
        IComet comet = IComet(_market);
        IComet.AssetInfo memory assetInfo = comet.getAssetInfoByAddress(_tokenAddr);

        return comet.getPrice(assetInfo.priceFeed);
    }

    function getGovernanceInfoFull(address _market) public view returns (GovernanceInfoFull memory govInfo) {
        IComet comet = IComet(_market);

        govInfo = GovernanceInfoFull({
            isSupplyPaused: comet.isSupplyPaused(),
            isTransferPaused: comet.isTransferPaused(),
            isWithdrawPaused: comet.isWithdrawPaused(),
            isAbsorbPaused: comet.isAbsorbPaused()
        });
    }

    function getRewardsOwed(address _market, address _user) public returns (ICometRewards.RewardOwed memory rewardsOwed){
        return ICometRewards(COMET_REWARDS_ADDR).getRewardOwed(_market, _user);
    }
}