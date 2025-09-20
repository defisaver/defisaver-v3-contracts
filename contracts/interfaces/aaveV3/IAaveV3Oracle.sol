// SPDX-License-Identifier: AGPL-3.0
pragma solidity =0.8.24;

import {IPriceOracleGetter} from "./IPriceOracleGetter.sol";

interface IAaveV3Oracle is IPriceOracleGetter {
    /**
     * @notice Returns a list of prices from a list of assets addresses scaled to 1e8
     * @param assets The list of assets addresses
     * @return The prices of the given assets scaled to 1e8
     */
    function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory);

    /**
     * @notice Returns the address of the source for an asset address
     * @param asset The address of the asset
     * @return The address of the source
     */
    function getSourceOfAsset(address asset) external view returns (address);
}
