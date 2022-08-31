// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../DS/DSMath.sol";
import "../utils/Exponential.sol";
import "../interfaces/compoundV3/IComet.sol";
import "../interfaces/compoundV3/ICometExt.sol";
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
        uint maxDebt;
    }
    
    uint64 public constant FACTOR_SCALE = 1e18;
    uint64 public constant BASE_SCALE = 1e6;
    uint public constant PRICE_FEED_SCALE = 1e8;

    IComet public constant comet = IComet(COMET_ADDR);
    ICometExt public constant cometExt = ICometExt(COMET_EXT_ADDR);

    /// @notice Returns all supported collateral assets 
    function getAssets() public view returns(IComet.AssetInfo[] memory assets){
        uint8 numAssets = comet.numAssets();
        assets = new IComet.AssetInfo[](numAssets);
        for(uint8 i=0;i<numAssets;i++){
            assets[i]=comet.getAssetInfo(i);
        }
        return assets;
    }


    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _users Addresses of the user
    /// @return loans Array of LoanData information
    function getLoanDataArr(address[] memory _users) public view returns (LoanData[] memory loans) {
        loans = new LoanData[](_users.length);

        for (uint i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_users[i]);
        }
    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _user) public view returns (LoanData memory data) {
        IComet.AssetInfo[] memory assets = getAssets();

        data = LoanData({
            user: _user,
            collAddr: new address[](assets.length),
            collAmounts: new uint[](assets.length),
            depositAmount: 0,
            depositValue: 0,
            borrowAmount: 0,
            borrowValue: 0,
            collValue: 0,
            maxDebt: 0
        });

        for (uint i = 0; i < assets.length; i++) {
            address asset = assets[i].asset;
            address priceFeed = assets[i].priceFeed; 

            uint tokenBalance = comet.collateralBalanceOf(_user,asset);
            data.collAddr[i] = asset;
            data.collAmounts[i] = tokenBalance;
            if (tokenBalance != 0) {
                data.collAddr[i] = asset;
                uint value = tokenBalance * comet.getPrice(priceFeed) / PRICE_FEED_SCALE / assets[i].scale;
                data.collAmounts[i] = tokenBalance;
                data.collValue += value;
                data.maxDebt += value* assets[i].liquidationFactor/ FACTOR_SCALE;
            }
        }
        address usdcPriceFeed = comet.baseTokenPriceFeed();
        data.borrowAmount = comet.borrowBalanceOf(_user);
        data.borrowValue = comet.borrowBalanceOf(_user) * comet.getPrice(usdcPriceFeed) / PRICE_FEED_SCALE / BASE_SCALE;
        data.depositAmount = comet.balanceOf(_user);
        data.depositValue = comet.balanceOf(_user) * comet.getPrice(usdcPriceFeed) / PRICE_FEED_SCALE / BASE_SCALE;

        return data;
    }
}