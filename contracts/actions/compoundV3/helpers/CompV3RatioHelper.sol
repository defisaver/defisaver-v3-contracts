// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { IComet } from "../../../interfaces/protocols/compoundV3/IComet.sol";
import { MainnetCompV3Addresses } from "./MainnetCompV3Addresses.sol";

contract CompV3RatioHelper is DSMath, MainnetCompV3Addresses {
    function getAssets(address _market) public view returns (IComet.AssetInfo[] memory assets) {
        uint8 numAssets = IComet(_market).numAssets();
        assets = new IComet.AssetInfo[](numAssets);

        for (uint8 i = 0; i < numAssets; i++) {
            assets[i] = IComet(_market).getAssetInfo(i);
        }
        return assets;
    }

    /// @notice Calculated the ratio of debt / adjusted collateral
    /// @param _user Address of the user
    function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IComet comet = IComet(_market);
        IComet.AssetInfo[] memory assets = getAssets(_market);
        uint16 assetsIn = comet.userBasic(_user).assetsIn;

        uint256 sumBorrow =
            comet.borrowBalanceOf(_user) * comet.getPrice(comet.baseTokenPriceFeed()) / comet.priceScale();
        if (sumBorrow == 0) return 0;

        uint256 sumCollateral;
        for (uint8 i; i < assets.length; ++i) {
            if (isInAsset(assetsIn, i)) {
                uint256 tokenBalance = comet.collateralBalanceOf(_user, assets[i].asset);
                if (tokenBalance != 0) {
                    uint256 collAmountInBaseToken =
                        (tokenBalance * comet.getPrice(assets[i].priceFeed) * comet.baseScale()) / assets[i].scale
                            / comet.priceScale();
                    sumCollateral += collAmountInBaseToken * assets[i].borrowCollateralFactor / 1e18;
                }
            }
        }

        return wdiv(sumCollateral, sumBorrow);
    }

    function isInAsset(uint16 assetsIn, uint8 assetOffset) internal pure returns (bool) {
        return (assetsIn & (uint16(1) << assetOffset) != 0);
    }
}
