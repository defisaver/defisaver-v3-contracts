// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IComet } from "../../../interfaces/protocols/compoundV3/IComet.sol";
import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { MainnetCompV3Addresses } from "./MainnetCompV3Addresses.sol";

contract CompV3RatioHelper is DSMath, MainnetCompV3Addresses {
    /// @notice Calculates safety ratio - the ratio of debt / adjusted collateral
    /// @param _market Address of the market
    /// @param _user Address of the user
    /// @return The safety ratio
    function getSafetyRatio(address _market, address _user) public view returns (uint256) {
        IComet comet = IComet(_market);
        IComet.AssetInfo[] memory assets = _getAssets(_market);
        IComet.UserBasic memory userBasic = comet.userBasic(_user);

        uint256 sumBorrow = comet.borrowBalanceOf(_user)
            * comet.getPrice(comet.baseTokenPriceFeed()) / comet.priceScale();
        if (sumBorrow == 0) return 0;

        uint256 sumCollateral;
        for (uint8 i; i < assets.length; ++i) {
            if (_isInAsset(userBasic.assetsIn, i, userBasic._reserved)) {
                uint256 tokenBalance = comet.collateralBalanceOf(_user, assets[i].asset);
                if (tokenBalance != 0) {
                    uint256 collAmountInBaseToken =
                        (tokenBalance * comet.getPrice(assets[i].priceFeed) * comet.baseScale())
                            / assets[i].scale / comet.priceScale();
                    sumCollateral += collAmountInBaseToken * assets[i].borrowCollateralFactor / WAD;
                }
            }
        }

        return wdiv(sumCollateral, sumBorrow);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL
    //////////////////////////////////////////////////////////////*/
    function _getAssets(address _market) internal view returns (IComet.AssetInfo[] memory assets) {
        uint8 numAssets = IComet(_market).numAssets();
        assets = new IComet.AssetInfo[](numAssets);

        for (uint8 i = 0; i < numAssets; i++) {
            assets[i] = IComet(_market).getAssetInfo(i);
        }
        return assets;
    }

    function _isInAsset(uint16 _assetsIn, uint8 _assetOffset, uint8 _reserved)
        internal
        pure
        returns (bool)
    {
        if (_assetOffset < 16) {
            // check bit in _assetsIn (for bits 0-15)
            return (_assetsIn & (uint16(1) << _assetOffset)) != 0;
        } else if (_assetOffset < 24) {
            // check bit in _reserved (for bits 16-23)
            return (_reserved & (uint8(1) << (_assetOffset - 16))) != 0;
        }
        return false; // if _assetOffset >= 24 (should not happen)
    }

    function _isRatioZero(uint256 _ratio) internal pure returns (bool) {
        return _ratio == 0;
    }
}
