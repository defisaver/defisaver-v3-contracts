// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../DS/DSMath.sol";
import "../utils/Exponential.sol";
import "../interfaces/compoundV3/IComet.sol";
import "../actions/compoundV3/helpers/CompV3Helper.sol";

contract CompV3View is Exponential, DSMath, CompV3Helper {

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
    }

    struct GovernanceInfoFull {
        bool isSupplyPaused;
        bool isTransferPaused;
        bool isWithdrawPaused;
        bool isAbsorbPaused;
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

        for (uint i = 0; i < assets.length; i++) {
            address asset = assets[i].asset;
            address priceFeed = assets[i].priceFeed; 

            uint tokenBalance = comet.collateralBalanceOf(_user,asset);
            data.collAddr[i] = asset;
            data.collAmounts[i] = tokenBalance;
            if (tokenBalance != 0) {
                data.collAddr[i] = asset;
                uint value = tokenBalance * comet.getPrice(priceFeed) / assets[i].scale;
                data.collAmounts[i] = tokenBalance;
                data.collValue += value;
            }
        }

        address usdcPriceFeed = comet.baseTokenPriceFeed();
        data.borrowAmount = comet.borrowBalanceOf(_user);
        data.borrowValue = comet.borrowBalanceOf(_user) * comet.getPrice(usdcPriceFeed) / comet.priceScale();
        data.depositAmount = comet.balanceOf(_user);
        data.depositValue = comet.balanceOf(_user) * comet.getPrice(usdcPriceFeed) / comet.priceScale();

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
            utilization: utilization
        });
    }

    function getFullCollInfos(address _market, address[] memory _tokensAddr) public returns(CollateralInfoFull[] memory colls) {
        colls = new CollateralInfoFull[](_tokensAddr.length);

        for (uint i; i < _tokensAddr.length; ++i) {
            colls[i] = getFullCollInfo(_market, _tokensAddr[i]);
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
}