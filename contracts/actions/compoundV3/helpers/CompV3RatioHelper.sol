// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../DS/DSMath.sol";
import "../../../utils/Exponential.sol";
import "../../../interfaces/compoundV3/IComet.sol";


contract CompV3RatioHelper is Exponential, DSMath {

    function getAssets(address _market) public view returns(IComet.AssetInfo[] memory assets){
        uint8 numAssets = IComet(_market).numAssets();
        assets = new IComet.AssetInfo[](numAssets);

        for(uint8 i = 0; i < numAssets; i++){
            assets[i] = IComet(_market).getAssetInfo(i);
        }
        return assets;
    }

    /// @notice Calculated the ratio of debt / adjusted collateral
    /// @param _user Address of the user
    function getSafetyRatio(address _market, address _user) public view returns (uint) {
        IComet comet = IComet(_market);
        IComet.AssetInfo[] memory assets = getAssets(_market);

        uint16 assetsIn = comet.userBasic(_user).assetsIn;

        address usdcPriceFeed = comet.baseTokenPriceFeed();
        uint sumBorrow = comet.borrowBalanceOf(_user) * comet.getPrice(usdcPriceFeed) / comet.priceScale();
        if (sumBorrow == 0) return 0;

        uint sumCollateral;
        uint length = assets.length;
        for (uint8 i; i < length; ++i) {
            if (isInAsset(assetsIn, i)) {
                address asset = assets[i].asset;
                address priceFeed = assets[i].priceFeed; 

                uint tokenBalance = comet.collateralBalanceOf(_user, asset);

                if (tokenBalance != 0) {
                    uint256 collUsdAmount = (tokenBalance * comet.getPrice(priceFeed)) / assets[i].scale;
                    sumCollateral += collUsdAmount * assets[i].borrowCollateralFactor / 1e18;
                }
            }
        }

        return div16Precision(sumCollateral, sumBorrow);
    }

    function div16Precision(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, 10**16), y / 2) / y;
    }

    function isInAsset(uint16 assetsIn, uint8 assetOffset) internal pure returns (bool) {
        return (assetsIn & (uint16(1) << assetOffset) != 0);
    }
}