// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../interfaces/IERC20.sol";
import "../interfaces/rari/IFundProxy.sol";
import "../interfaces/rari/IFundController.sol";
import "../interfaces/rari/IFuseAsset.sol";
import "../DS/DSMath.sol";

contract RariView is DSMath {

    /// @dev Not set as view because it calls some non view methods
    /// @param _tokenAddr Address od the underlying token
    /// @param _fundProxyAddr FundProxy addr
    /// @param _controllerAddr RariFundController addr
    function getPoolLiquidity(
        address _tokenAddr,
        address _fundProxyAddr,
        address _controllerAddr
    ) public returns (uint256) {

        string memory currencyCode = IERC20(_tokenAddr).symbol();

        // Step 1: Get raw data of fund
        (
            string[] memory currencyArr,
            ,
            uint8[][] memory pools,
            uint256[][] memory amountsMap,
        ) = IFundProxy(_fundProxyAddr).getRawFundBalancesAndPrices();

        // Step 2: Get index of currency code we are searching for
        uint256 currencyIndex = findCurrencyIndex(currencyArr, currencyCode);

        uint8[] memory currencyPoolIds = pools[currencyIndex];
        uint256[] memory amounts = amountsMap[currencyIndex];

        // Step 3: Go over each pool and calculate pool asset liquidity (skip over legacy)
        uint256 totalFuseAssetBalance = 0;
        for (uint256 i = 0; i < currencyPoolIds.length; ++i) {
            // under 100 ids are legacy
            if (uint8(currencyPoolIds[i]) < 100 && amounts[i] == 0) continue;

            address fuseAssetsAddr = IFundController(_controllerAddr).fuseAssets(
                uint8(currencyPoolIds[i]),
                currencyCode
            );

            uint256 cash = IFuseAsset(fuseAssetsAddr).getCash();

            if (cash >= amounts[i]){
                totalFuseAssetBalance += amounts[i];
            } else {
                totalFuseAssetBalance += cash;
                break;
            }

        }

        // STEP 4: Add contract balance to final sum
        uint256 contractBalance = IERC20(_tokenAddr).balanceOf(_controllerAddr);

        return contractBalance + totalFuseAssetBalance;
    }

    function findCurrencyIndex(string[] memory _currencyArr, string memory _targetCode)
        public        
        pure
        returns (uint256)
    {
        for (uint256 i = 0; i < _currencyArr.length; ++i) {
            if (keccak256(abi.encode(_currencyArr[i])) == keccak256(abi.encode(_targetCode))) {
                return i;
            }
        }

        // so we revert down the line if we don't find the index
        return type(uint256).max;
    }
}
